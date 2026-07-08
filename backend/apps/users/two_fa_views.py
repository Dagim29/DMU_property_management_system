"""
Two-Factor Authentication (2FA) Views
Handles TOTP-based 2FA setup, verification, and management
"""
import pyotp
import qrcode
import io
import base64
import secrets
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import User


def generate_backup_codes(count=10):
    """Generate backup codes for 2FA recovery"""
    return [secrets.token_hex(4).upper() for _ in range(count)]


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enable_2fa(request):
    """
    Step 1: Generate 2FA secret + QR code.
    Returns secret and QR code. The frontend must pass `secret` back in the verify step.
    No Django session used — compatible with stateless JWT.
    """
    user = request.user

    if user.two_fa_enabled:
        return Response(
            {'error': '2FA is already enabled for this user'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Generate a new secret
    secret = pyotp.random_base32()

    # Create TOTP URI for QR code
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user.email,
        issuer_name='DMU Asset Management'
    )

    # Generate QR code image
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()

    # Generate backup codes now; they'll be saved after verification
    backup_codes = generate_backup_codes()

    # Temporarily store secret on user so verify step can confirm it
    # two_fa_enabled stays False until verified
    user.two_fa_secret = secret
    user.backup_codes = backup_codes
    user.save(update_fields=['two_fa_secret', 'backup_codes'])

    return Response({
        'secret': secret,
        'qr_code': f'data:image/png;base64,{qr_code_base64}',
        'backup_codes': backup_codes,
        'message': 'Scan the QR code with your authenticator app, then call verify-enable with the 6-digit code.'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_and_enable_2fa(request):
    """
    Step 2: Verify the TOTP code and finalize 2FA activation.
    The secret was stored on the user object in step 1 (enable_2fa).
    Stateless — no Django sessions required.
    """
    user = request.user
    code = request.data.get('code')

    if not code:
        return Response(
            {'error': 'Verification code is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Secret was saved temporarily in enable_2fa step
    secret = user.two_fa_secret
    if not secret:
        return Response(
            {'error': 'No pending 2FA setup found. Please restart the setup process.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Verify the TOTP code
    totp = pyotp.TOTP(secret)
    if not totp.verify(code, valid_window=1):
        return Response(
            {'error': 'Invalid verification code. Please try again with the current 6-digit code.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Activate 2FA
    backup_codes = user.backup_codes or []
    user.two_fa_enabled = True
    user.two_fa_method = 'TOTP'
    user.two_fa_enabled_at = timezone.now()
    user.save(update_fields=['two_fa_enabled', 'two_fa_method', 'two_fa_enabled_at'])

    return Response({
        'message': '2FA has been successfully enabled on your account.',
        'backup_codes': backup_codes,
        'enabled_at': user.two_fa_enabled_at.isoformat()
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def disable_2fa(request):
    """
    Disable 2FA for the authenticated user
    Requires password confirmation
    """
    user = request.user
    password = request.data.get('password')
    
    if not password:
        return Response(
            {'error': 'Password is required to disable 2FA'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not user.check_password(password):
        return Response(
            {'error': 'Invalid password'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not user.two_fa_enabled:
        return Response(
            {'error': '2FA is not enabled for this user'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Disable 2FA
    user.two_fa_enabled = False
    user.two_fa_secret = ''
    user.two_fa_enabled_at = None
    user.backup_codes = []
    user.save()
    
    return Response({
        'message': '2FA has been successfully disabled'
    })


@api_view(['POST'])
def verify_2fa_code(request):
    """
    Verify 2FA code during login
    This is called after username/password authentication
    """
    user_id = request.data.get('user_id')
    code = request.data.get('code')
    
    if not user_id or not code:
        return Response(
            {'error': 'User ID and code are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if not user.two_fa_enabled:
        return Response(
            {'error': '2FA is not enabled for this user'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if it's a backup code
    if code.upper() in user.backup_codes:
        # Remove used backup code
        user.backup_codes.remove(code.upper())
        user.save()
        return Response({
            'verified': True,
            'message': 'Backup code verified successfully',
            'remaining_backup_codes': len(user.backup_codes)
        })
    
    # Verify TOTP code
    totp = pyotp.TOTP(user.two_fa_secret)
    if totp.verify(code, valid_window=1):
        return Response({
            'verified': True,
            'message': '2FA code verified successfully'
        })
    
    return Response(
        {'verified': False, 'error': 'Invalid 2FA code'},
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_2fa_status(request):
    """
    Get 2FA status for the authenticated user
    """
    user = request.user
    
    return Response({
        'two_fa_enabled': user.two_fa_enabled,
        'two_fa_method': user.two_fa_method if user.two_fa_enabled else None,
        'two_fa_enabled_at': user.two_fa_enabled_at.isoformat() if user.two_fa_enabled_at else None,
        'backup_codes_remaining': len(user.backup_codes) if user.two_fa_enabled else 0
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def regenerate_backup_codes(request):
    """
    Regenerate backup codes for 2FA
    Requires password confirmation
    """
    user = request.user
    password = request.data.get('password')
    
    if not password:
        return Response(
            {'error': 'Password is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not user.check_password(password):
        return Response(
            {'error': 'Invalid password'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not user.two_fa_enabled:
        return Response(
            {'error': '2FA is not enabled'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Generate new backup codes
    backup_codes = generate_backup_codes()
    user.backup_codes = backup_codes
    user.save()
    
    return Response({
        'message': 'Backup codes regenerated successfully',
        'backup_codes': backup_codes
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_toggle_user_2fa(request, user_id):
    """
    Admin endpoint to enable/disable 2FA for any user
    Only accessible by admins
    """
    if request.user.role not in ['SUPER_ADMIN', 'PROPERTY_MANAGER']:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    action = request.data.get('action')  # 'enable' or 'disable'
    
    if action == 'enable':
        if user.two_fa_enabled:
            return Response(
                {'error': '2FA is already enabled for this user'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate secret and backup codes
        secret = pyotp.random_base32()
        backup_codes = generate_backup_codes()
        
        user.two_fa_enabled = True
        user.two_fa_secret = secret
        user.two_fa_method = 'TOTP'
        user.two_fa_enabled_at = timezone.now()
        user.backup_codes = backup_codes
        user.save()
        
        return Response({
            'message': f'2FA enabled for user {user.username}',
            'backup_codes': backup_codes
        })
    
    elif action == 'disable':
        if not user.two_fa_enabled:
            return Response(
                {'error': '2FA is not enabled for this user'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.two_fa_enabled = False
        user.two_fa_secret = ''
        user.two_fa_enabled_at = None
        user.backup_codes = []
        user.save()
        
        return Response({
            'message': f'2FA disabled for user {user.username}'
        })
    
    return Response(
        {'error': 'Invalid action. Use "enable" or "disable"'},
        status=status.HTTP_400_BAD_REQUEST
    )
