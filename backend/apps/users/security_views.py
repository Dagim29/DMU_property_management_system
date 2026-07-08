"""
Security-related API views for BR-UM-04, BR-UM-05, BR-UM-06
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count
from apps.core.permissions import IsSuperAdmin
from . import models
from . import serializers

User = get_user_model()


class UserSessionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for managing user sessions (BR-UM-06).
    Allows viewing and terminating sessions.
    """
    serializer_class = serializers.UserSessionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['user', 'is_active']
    ordering_fields = ['login_time', 'last_activity']
    ordering = ['-login_time']
    
    def get_queryset(self):
        """Users can only see their own sessions, admins can see all."""
        if self.request.user.role == 'SUPER_ADMIN':
            return models.UserSession.objects.all()
        return models.UserSession.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def terminate(self, request, pk=None):
        """Terminate a specific session."""
        session = self.get_object()
        
        # Users can only terminate their own sessions
        if session.user != request.user and request.user.role != 'SUPER_ADMIN':
            return Response(
                {'error': 'You can only terminate your own sessions'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        session.terminate()
        
        return Response({
            'message': 'Session terminated successfully',
            'session_id': session.id
        })
    
    @action(detail=False, methods=['post'])
    def terminate_all(self, request):
        """Terminate all sessions for the current user except the current one."""
        current_session_key = request.data.get('current_session_key')
        
        sessions = models.UserSession.objects.filter(
            user=request.user,
            is_active=True
        )
        
        if current_session_key:
            sessions = sessions.exclude(session_key=current_session_key)
        
        count = sessions.count()
        sessions.update(is_active=False)
        
        return Response({
            'message': f'Terminated {count} session(s)',
            'count': count
        })
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active sessions for the current user."""
        sessions = models.UserSession.objects.filter(
            user=request.user,
            is_active=True
        )
        serializer = self.get_serializer(sessions, many=True)
        return Response(serializer.data)


class SecurityAlertViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for security alerts (BR-UM-04, BR-UM-05, BR-UM-06).
    """
    serializer_class = serializers.SecurityAlertSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['user', 'alert_type', 'severity', 'acknowledged']
    ordering_fields = ['created_at', 'severity']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Users can only see their own alerts, admins can see all."""
        if self.request.user.role == 'SUPER_ADMIN':
            return models.SecurityAlert.objects.all()
        return models.SecurityAlert.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """Acknowledge a security alert."""
        alert = self.get_object()
        
        # Users can only acknowledge their own alerts
        if alert.user != request.user and request.user.role != 'SUPER_ADMIN':
            return Response(
                {'error': 'You can only acknowledge your own alerts'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from django.utils import timezone
        alert.acknowledged = True
        alert.acknowledged_by = request.user
        alert.acknowledged_at = timezone.now()
        alert.save()
        
        return Response({
            'message': 'Alert acknowledged',
            'alert_id': alert.id
        })
    
    @action(detail=False, methods=['post'])
    def acknowledge_all(self, request):
        """Acknowledge all unacknowledged alerts for the current user."""
        from django.utils import timezone
        
        alerts = models.SecurityAlert.objects.filter(
            user=request.user,
            acknowledged=False
        )
        
        count = alerts.count()
        alerts.update(
            acknowledged=True,
            acknowledged_by=request.user,
            acknowledged_at=timezone.now()
        )
        
        return Response({
            'message': f'Acknowledged {count} alert(s)',
            'count': count
        })
    
    @action(detail=False, methods=['get'])
    def unacknowledged(self, request):
        """Get all unacknowledged alerts for the current user."""
        alerts = models.SecurityAlert.objects.filter(
            user=request.user,
            acknowledged=False
        )
        serializer = self.get_serializer(alerts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get security alert statistics."""
        user = request.user
        
        if user.role == 'SUPER_ADMIN':
            queryset = models.SecurityAlert.objects.all()
        else:
            queryset = models.SecurityAlert.objects.filter(user=user)
        
        stats = {
            'total': queryset.count(),
            'unacknowledged': queryset.filter(acknowledged=False).count(),
            'by_type': {},
            'by_severity': {}
        }
        
        # Count by type
        for alert_type, _ in models.SecurityAlert.ALERT_TYPES:
            count = queryset.filter(alert_type=alert_type).count()
            if count > 0:
                stats['by_type'][alert_type] = count
        
        # Count by severity
        for severity, _ in models.SecurityAlert.SEVERITY_CHOICES:
            count = queryset.filter(severity=severity).count()
            if count > 0:
                stats['by_severity'][severity] = count
        
        return Response(stats)



class IPAccessControlViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing IP whitelist and blacklist.
    """
    serializer_class = serializers.IPAccessControlSerializer
    permission_classes = [IsSuperAdmin]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['list_type', 'is_active']
    ordering_fields = ['added_at', 'last_used', 'block_count']
    ordering = ['-added_at']
    
    def get_queryset(self):
        return models.IPAccessControl.objects.all()
    
    def perform_create(self, serializer):
        """Set the added_by field to the current user."""
        serializer.save(added_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def whitelist(self, request):
        """Get all whitelist entries."""
        queryset = self.get_queryset().filter(list_type='WHITELIST', is_active=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def blacklist(self, request):
        """Get all blacklist entries."""
        queryset = self.get_queryset().filter(list_type='BLACKLIST', is_active=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        """Bulk import IP access control rules from JSON."""
        data = request.data
        
        created_count = 0
        errors = []
        
        # Import whitelist
        whitelist_data = data.get('whitelist', [])
        for entry in whitelist_data:
            try:
                # Check for duplicates
                if models.IPAccessControl.objects.filter(
                    ip_address=entry.get('ip_address'),
                    list_type='WHITELIST'
                ).exists():
                    errors.append(f"Duplicate whitelist entry: {entry.get('ip_address')}")
                    continue
                
                models.IPAccessControl.objects.create(
                    ip_address=entry.get('ip_address'),
                    list_type='WHITELIST',
                    description=entry.get('description', ''),
                    added_by=request.user
                )
                created_count += 1
            except Exception as e:
                errors.append(f"Error importing {entry.get('ip_address')}: {str(e)}")
        
        # Import blacklist
        blacklist_data = data.get('blacklist', [])
        for entry in blacklist_data:
            try:
                # Check for duplicates
                if models.IPAccessControl.objects.filter(
                    ip_address=entry.get('ip_address'),
                    list_type='BLACKLIST'
                ).exists():
                    errors.append(f"Duplicate blacklist entry: {entry.get('ip_address')}")
                    continue
                
                models.IPAccessControl.objects.create(
                    ip_address=entry.get('ip_address'),
                    list_type='BLACKLIST',
                    description=entry.get('description', ''),
                    added_by=request.user
                )
                created_count += 1
            except Exception as e:
                errors.append(f"Error importing {entry.get('ip_address')}: {str(e)}")
        
        return Response({
            'message': f'Successfully imported {created_count} IP rules',
            'created_count': created_count,
            'errors': errors
        })
    
    @action(detail=False, methods=['post'])
    def clear_list(self, request):
        """Clear all entries from whitelist or blacklist."""
        list_type = request.data.get('list_type')
        
        if list_type not in ['WHITELIST', 'BLACKLIST']:
            return Response(
                {'error': 'Invalid list_type. Must be WHITELIST or BLACKLIST'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        count = models.IPAccessControl.objects.filter(list_type=list_type).delete()[0]
        
        return Response({
            'message': f'Cleared {count} entries from {list_type.lower()}',
            'count': count
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get IP access control statistics."""
        stats = {
            'whitelist_count': models.IPAccessControl.objects.filter(
                list_type='WHITELIST', is_active=True
            ).count(),
            'blacklist_count': models.IPAccessControl.objects.filter(
                list_type='BLACKLIST', is_active=True
            ).count(),
            'total_blocks': models.IPAccessControl.objects.filter(
                list_type='BLACKLIST'
            ).aggregate(total=Sum('block_count'))['total'] or 0,
            'recent_additions': models.IPAccessControl.objects.filter(
                is_active=True
            ).order_by('-added_at')[:5].count()
        }
        
        stats['total_rules'] = stats['whitelist_count'] + stats['blacklist_count']
        
        return Response(stats)


class FailedLoginAttemptViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing failed login attempts.
    """
    serializer_class = serializers.FailedLoginAttemptSerializer
    permission_classes = [IsSuperAdmin]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['username', 'ip_address']
    ordering_fields = ['attempt_time']
    ordering = ['-attempt_time']
    
    def get_queryset(self):
        return models.FailedLoginAttempt.objects.all()
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary of failed login attempts grouped by IP and username."""
        from django.db.models import Count
        from datetime import timedelta
        from django.utils import timezone
        
        # Get attempts from last 24 hours
        since = timezone.now() - timedelta(hours=24)
        
        by_ip = models.FailedLoginAttempt.objects.filter(
            attempt_time__gte=since
        ).values('ip_address').annotate(
            count=Count('id'),
            usernames=Count('username', distinct=True)
        ).order_by('-count')[:10]
        
        by_username = models.FailedLoginAttempt.objects.filter(
            attempt_time__gte=since
        ).values('username').annotate(
            count=Count('id'),
            ips=Count('ip_address', distinct=True)
        ).order_by('-count')[:10]
        
        return Response({
            'by_ip': list(by_ip),
            'by_username': list(by_username),
            'total_attempts_24h': models.FailedLoginAttempt.objects.filter(
                attempt_time__gte=since
            ).count()
        })



class SecurityAuditViewSet(viewsets.ViewSet):
    """
    ViewSet for running security audits and getting security scores.
    """
    permission_classes = [IsSuperAdmin]
    
    @action(detail=False, methods=['post'])
    def run_audit(self, request):
        """Run a comprehensive security audit."""
        from django.conf import settings
        from apps.core.models import SystemSettings
        
        checks = []
        score = 100
        
        # Get system settings
        try:
            sys_settings = SystemSettings.objects.first()
        except:
            sys_settings = None
        
        # 1. Password Policy Check
        if sys_settings:
            if sys_settings.password_min_length >= 8:
                checks.append({
                    'name': 'Password Policy',
                    'status': 'pass',
                    'message': f'Strong password requirements enabled (min {sys_settings.password_min_length} characters)'
                })
            else:
                checks.append({
                    'name': 'Password Policy',
                    'status': 'warning',
                    'message': f'Password minimum length is only {sys_settings.password_min_length} characters. Recommend 8+'
                })
                score -= 10
        else:
            checks.append({
                'name': 'Password Policy',
                'status': 'warning',
                'message': 'System settings not configured'
            })
            score -= 5
        
        # 2. Session Timeout Check
        session_timeout = getattr(sys_settings, 'session_timeout', None) if sys_settings else None
        if session_timeout:
            if session_timeout <= 60:
                checks.append({
                    'name': 'Session Timeout',
                    'status': 'pass',
                    'message': f'Sessions expire after {session_timeout} minutes'
                })
            else:
                checks.append({
                    'name': 'Session Timeout',
                    'status': 'warning',
                    'message': f'Session timeout is {session_timeout} minutes. Recommend 60 or less'
                })
                score -= 5
        else:
            checks.append({
                'name': 'Session Timeout',
                'status': 'warning',
                'message': 'Session timeout not configured'
            })
            score -= 5
        
        # 3. 2FA Coverage Check
        total_admins = User.objects.filter(
            role__in=['SUPER_ADMIN', 'PROPERTY_MANAGER']
        ).count()
        
        # Note: 2FA field doesn't exist yet, so we'll simulate
        checks.append({
            'name': '2FA Coverage',
            'status': 'warning',
            'message': f'2FA not yet implemented for {total_admins} admin users'
        })
        score -= 10
        
        # 4. IP Restrictions Check
        whitelist_count = models.IPAccessControl.objects.filter(
            list_type='WHITELIST', is_active=True
        ).count()
        
        if whitelist_count > 0:
            checks.append({
                'name': 'IP Restrictions',
                'status': 'pass',
                'message': f'IP whitelist configured with {whitelist_count} rules'
            })
        else:
            checks.append({
                'name': 'IP Restrictions',
                'status': 'warning',
                'message': 'No IP whitelist configured. Consider restricting access by IP'
            })
            score -= 5
        
        # 5. Failed Login Protection Check
        max_attempts = getattr(sys_settings, 'max_login_attempts', None) if sys_settings else None
        if max_attempts:
            checks.append({
                'name': 'Failed Login Protection',
                'status': 'pass',
                'message': f'Account lockout after {max_attempts} failed attempts'
            })
        else:
            checks.append({
                'name': 'Failed Login Protection',
                'status': 'warning',
                'message': 'Failed login protection not configured'
            })
            score -= 10
        
        # 6. HTTPS/SSL Check
        if settings.DEBUG:
            checks.append({
                'name': 'SSL/TLS',
                'status': 'warning',
                'message': 'Running in DEBUG mode. Ensure HTTPS is enabled in production'
            })
            score -= 5
        else:
            checks.append({
                'name': 'SSL/TLS',
                'status': 'pass',
                'message': 'Production mode enabled'
            })
        
        # 7. Audit Logging Check
        from apps.core.models import AuditLog
        recent_logs = AuditLog.objects.count()
        
        if recent_logs > 0:
            checks.append({
                'name': 'Audit Logging',
                'status': 'pass',
                'message': f'Audit logging active with {recent_logs} total entries'
            })
        else:
            checks.append({
                'name': 'Audit Logging',
                'status': 'warning',
                'message': 'No audit logs found'
            })
            score -= 5
        
        # 8. Password Expiry Check
        password_expiry = getattr(sys_settings, 'password_expiry_days', None) if sys_settings else None
        if password_expiry:
            if password_expiry <= 90:
                checks.append({
                    'name': 'Password Expiry',
                    'status': 'pass',
                    'message': f'Passwords expire after {password_expiry} days'
                })
            else:
                checks.append({
                    'name': 'Password Expiry',
                    'status': 'warning',
                    'message': f'Password expiry is {password_expiry} days. Recommend 90 or less'
                })
                score -= 5
        else:
            checks.append({
                'name': 'Password Expiry',
                'status': 'warning',
                'message': 'Password expiry not configured'
            })
            score -= 10
        
        # 9. Inactive Account Detection
        from django.utils import timezone
        from datetime import timedelta
        
        inactive_threshold = timezone.now() - timedelta(days=180)
        inactive_users = User.objects.filter(
            last_activity__lt=inactive_threshold,
            is_active=True
        ).count()
        
        if inactive_users == 0:
            checks.append({
                'name': 'Inactive Accounts',
                'status': 'pass',
                'message': 'No inactive accounts detected (180+ days)'
            })
        else:
            checks.append({
                'name': 'Inactive Accounts',
                'status': 'warning',
                'message': f'{inactive_users} accounts inactive for 180+ days'
            })
            score -= 5
        
        # 10. Security Alerts Check
        unacknowledged_alerts = models.SecurityAlert.objects.filter(
            acknowledged=False,
            severity__in=['HIGH', 'CRITICAL']
        ).count()
        
        if unacknowledged_alerts == 0:
            checks.append({
                'name': 'Security Alerts',
                'status': 'pass',
                'message': 'No unacknowledged critical/high alerts'
            })
        else:
            checks.append({
                'name': 'Security Alerts',
                'status': 'fail',
                'message': f'{unacknowledged_alerts} unacknowledged critical/high severity alerts'
            })
            score -= 15
        
        # Ensure score doesn't go below 0
        score = max(0, score)
        
        return Response({
            'timestamp': timezone.now().isoformat(),
            'score': score,
            'checks': checks,
            'summary': {
                'total_checks': len(checks),
                'passed': len([c for c in checks if c['status'] == 'pass']),
                'warnings': len([c for c in checks if c['status'] == 'warning']),
                'failed': len([c for c in checks if c['status'] == 'fail'])
            }
        })
    
    @action(detail=False, methods=['get'])
    def recommendations(self, request):
        """Get security recommendations based on current configuration."""
        recommendations = []
        
        # Check system settings
        from apps.core.models import SystemSettings
        try:
            sys_settings = SystemSettings.objects.first()
        except:
            sys_settings = None
        
        if not sys_settings:
            recommendations.append({
                'priority': 'high',
                'category': 'Configuration',
                'title': 'Configure System Settings',
                'description': 'System security settings are not configured. Go to Security Policy tab to set up password requirements, session timeouts, and login security.',
                'action': 'Configure in Security Policy tab'
            })
        
        # Check for weak passwords (users without recent password changes)
        from django.utils import timezone
        from datetime import timedelta
        
        old_password_threshold = timezone.now() - timedelta(days=180)
        users_with_old_passwords = User.objects.filter(
            password_changed_at__lt=old_password_threshold
        ).count() if User.objects.filter(password_changed_at__isnull=False).exists() else 0
        
        if users_with_old_passwords > 0:
            recommendations.append({
                'priority': 'medium',
                'category': 'Password Security',
                'title': 'Force Password Reset',
                'description': f'{users_with_old_passwords} users have passwords older than 180 days. Consider forcing a password reset.',
                'action': 'Use bulk operations to force password reset'
            })
        
        # Check for admin accounts without 2FA
        admin_count = User.objects.filter(
            role__in=['SUPER_ADMIN', 'PROPERTY_MANAGER']
        ).count()
        
        if admin_count > 0:
            recommendations.append({
                'priority': 'high',
                'category': '2FA',
                'title': 'Enable Two-Factor Authentication',
                'description': f'Two-factor authentication is not enabled for {admin_count} admin accounts. This significantly improves security.',
                'action': 'Implement 2FA for all admin accounts'
            })
        
        # Check for IP whitelist
        whitelist_count = models.IPAccessControl.objects.filter(
            list_type='WHITELIST', is_active=True
        ).count()
        
        if whitelist_count == 0:
            recommendations.append({
                'priority': 'medium',
                'category': 'Access Control',
                'title': 'Configure IP Whitelist',
                'description': 'No IP whitelist configured. Restricting access by IP address adds an extra layer of security.',
                'action': 'Add trusted IP addresses to whitelist in IP Control tab'
            })
        
        # Check for unacknowledged security alerts
        unack_alerts = models.SecurityAlert.objects.filter(
            acknowledged=False
        ).count()
        
        if unack_alerts > 0:
            recommendations.append({
                'priority': 'high',
                'category': 'Monitoring',
                'title': 'Review Security Alerts',
                'description': f'{unack_alerts} security alerts need attention. Review and acknowledge them to maintain security awareness.',
                'action': 'Go to Security Alerts tab to review'
            })
        
        # Check for backup encryption
        recommendations.append({
            'priority': 'medium',
            'category': 'Data Protection',
            'title': 'Enable Backup Encryption',
            'description': 'Database backups should be encrypted to protect sensitive data at rest.',
            'action': 'Configure backup encryption in system settings'
        })
        
        return Response({
            'recommendations': recommendations,
            'total': len(recommendations),
            'by_priority': {
                'high': len([r for r in recommendations if r['priority'] == 'high']),
                'medium': len([r for r in recommendations if r['priority'] == 'medium']),
                'low': len([r for r in recommendations if r['priority'] == 'low'])
            }
        })
