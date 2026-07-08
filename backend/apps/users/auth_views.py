from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
from .serializers import UserSerializer
from .models import UserSession, SecurityAlert
from apps.core.utils import log_action, get_client_ip
from apps.core.models import SystemSettings
import user_agents


def get_device_info(user_agent_string):
    """Parse user agent to get device information."""
    ua = user_agents.parse(user_agent_string)
    return f"{ua.browser.family} on {ua.os.family}"


def check_concurrent_sessions(user, current_ip, current_device):
    """Check for concurrent sessions from different locations (BR-UM-06)."""
    active_sessions = UserSession.objects.filter(user=user, is_active=True)
    
    # Check if there are active sessions from different IPs
    different_ip_sessions = active_sessions.exclude(ip_address=current_ip)
    
    if different_ip_sessions.exists():
        # Create security alert for concurrent session
        for session in different_ip_sessions:
            SecurityAlert.objects.create(
                user=user,
                alert_type='CONCURRENT_SESSION',
                severity='HIGH',
                message=f'Concurrent login detected from {current_ip} while session active from {session.ip_address}',
                ip_address=current_ip,
                details={
                    'new_ip': current_ip,
                    'new_device': current_device,
                    'existing_ip': session.ip_address,
                    'existing_device': session.device_info,
                    'existing_login_time': session.login_time.isoformat()
                }
            )
        
        return True, different_ip_sessions.count()
    
    return False, 0


def record_failed_login(username, ip_address, user_agent_string, reason='Invalid credentials'):
    """Record a failed login attempt and create a SecurityAlert if user exists."""
    from .models import FailedLoginAttempt
    from django.contrib.auth import get_user_model
    User = get_user_model()

    FailedLoginAttempt.objects.create(
        username=username,
        ip_address=ip_address,
        user_agent=user_agent_string,
        reason=reason
    )

    try:
        user = User.objects.get(username=username)
        since = timezone.now() - timedelta(hours=1)
        recent_count = FailedLoginAttempt.objects.filter(
            username=username, attempt_time__gte=since
        ).count()
        severity = 'CRITICAL' if recent_count >= 5 else 'HIGH' if recent_count >= 3 else 'MEDIUM'
        SecurityAlert.objects.create(
            user=user,
            alert_type='FAILED_LOGIN',
            severity=severity,
            message=f'Failed login from {ip_address}: {reason} (#{recent_count} in last hour)',
            ip_address=ip_address,
            details={
                'username': username,
                'ip_address': ip_address,
                'reason': reason,
                'attempts_last_hour': recent_count
            }
        )
    except User.DoesNotExist:
        pass


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Login endpoint - returns JWT tokens with session tracking and security checks."""
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Capture client info early — needed for failure recording too
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    device_info = get_device_info(user_agent)
    
    user = authenticate(username=username, password=password)
    
    if user is None:
        record_failed_login(username, ip_address, user_agent, 'Invalid credentials')
        log_action(
            user=None,
            action='FAILED_LOGIN',
            model_name='User',
            object_id=None,
            details={'username': username, 'ip_address': ip_address, 'reason': 'Invalid credentials'},
            ip_address=ip_address
        )
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    if not user.is_active:
        record_failed_login(username, ip_address, user_agent, 'Account disabled')
        return Response(
            {'error': 'Account is disabled'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # BR-UM-05: Check if password change is required
    if user.password_change_required or user.is_password_expired():
        return Response({
            'error': 'Password change required',
            'password_expired': True,
            'message': 'Your password has expired. Please change it to continue.',
            'user_id': user.id
        }, status=status.HTTP_403_FORBIDDEN)
    
    # BR-UM-06: Check for concurrent sessions
    has_concurrent, concurrent_count = check_concurrent_sessions(user, ip_address, device_info)
    
    # Get session timeout from SystemSettings
    try:
        settings = SystemSettings.get_settings()
        session_timeout_minutes = settings.session_timeout
    except Exception:
        session_timeout_minutes = 60  # Default to 60 minutes if settings not available
    
    # Generate tokens with dynamic lifetime
    refresh = RefreshToken.for_user(user)
    
    # Set custom token lifetime based on SystemSettings
    refresh.access_token.set_exp(lifetime=timedelta(minutes=session_timeout_minutes))
    
    session_key = str(refresh.access_token)[:40]  # Use part of token as session key
    
    # Create or update session record (BR-UM-06)
    # Use update_or_create to avoid duplicate key errors
    UserSession.objects.update_or_create(
        session_key=session_key,
        defaults={
            'user': user,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'device_info': device_info,
            'location': 'Unknown',  # Can be enhanced with IP geolocation
            'is_active': True
        }
    )
    
    # BR-UM-04: Update last activity
    user.update_last_activity()
    
    # Reset inactivity warning if user logs back in
    if user.inactivity_warning_sent:
        user.inactivity_warning_sent = False
        user.inactivity_warning_date = None
        user.save(update_fields=['inactivity_warning_sent', 'inactivity_warning_date'])
    
    # Log the login action
    log_action(
        user=user,
        action='LOGIN',
        model_name='User',
        object_id=user.id,
        details={
            'username': user.username,
            'role': user.role,
            'ip_address': ip_address,
            'device': device_info,
            'concurrent_sessions': concurrent_count
        },
        ip_address=ip_address
    )
    
    response_data = {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user, context={'request': request}).data,
        'session_key': session_key,
        'session_timeout': session_timeout_minutes  # Send timeout to frontend
    }
    
    # Add warning if concurrent sessions detected
    if has_concurrent:
        response_data['warning'] = {
            'type': 'concurrent_session',
            'message': f'You have {concurrent_count} other active session(s) from different location(s).',
            'concurrent_count': concurrent_count
        }
    
    # Add password expiry warning if within 30 days
    days_until_expiry = user.days_until_password_expires()
    if days_until_expiry is not None and days_until_expiry <= 30:
        response_data['warning'] = response_data.get('warning', {})
        response_data['warning']['password_expiry'] = {
            'days_remaining': days_until_expiry,
            'message': f'Your password will expire in {days_until_expiry} days. Please change it soon.'
        }
    
    return Response(response_data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Logout endpoint - blacklist refresh token and terminate session."""
    try:
        # Terminate user session (BR-UM-06)
        session_key = request.data.get('session_key')
        if session_key:
            UserSession.objects.filter(
                user=request.user,
                session_key=session_key,
                is_active=True
            ).update(is_active=False)
        
        # Log the logout action before blacklisting token
        log_action(
            user=request.user,
            action='LOGOUT',
            model_name='User',
            object_id=request.user.id,
            details={'username': request.user.username},
            ip_address=get_client_ip(request)
        )
        
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'message': 'Logged out successfully'})
    except Exception:
        return Response(
            {'error': 'Invalid token'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    """Get current user profile."""
    return Response(UserSerializer(request.user, context={'request': request}).data)
