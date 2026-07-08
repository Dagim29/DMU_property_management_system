from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import AuditLog, SystemSettings, DatabaseBackup, Notification
from .serializers import AuditLogSerializer, SystemSettingsSerializer, DatabaseBackupSerializer, NotificationSerializer
from .permissions import IsSuperAdmin
from .utils import log_action, get_client_ip, create_database_backup, restore_database_backup, get_system_health, get_error_logs


class LargeResultsSetPagination(PageNumberPagination):
    """Custom pagination class that allows larger page sizes."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 10000


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing audit logs.
    Only Super Admins can view audit logs.
    Read-only - logs cannot be modified through the API.
    """
    queryset = AuditLog.objects.all().select_related('user')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    pagination_class = LargeResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action', 'model_name', 'user']
    search_fields = ['user__username', 'model_name', 'object_id', 'ip_address']
    ordering_fields = ['timestamp', 'action', 'model_name']
    ordering = ['-timestamp']


class SystemSettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for system settings.
    Only Super Admins can view and modify settings.
    Only one settings instance exists in the system.
    """
    queryset = SystemSettings.objects.all()
    serializer_class = SystemSettingsSerializer
    http_method_names = ['get', 'put', 'patch', 'post']  # Allow POST for custom actions
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsSuperAdmin()]
    
    def get_object(self):
        """Always return the single settings instance."""
        return SystemSettings.get_settings()
    
    def list(self, request, *args, **kwargs):
        """Return the single settings instance as a detail view."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """Update settings and log the action."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Log the settings update
        log_action(
            user=request.user,
            action='UPDATE',
            model_name='SystemSettings',
            object_id=instance.id,
            details={
                'updated_by': request.user.username,
                'fields_updated': list(request.data.keys())
            },
            ip_address=get_client_ip(request)
        )
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def reset_to_defaults(self, request):
        """Reset all settings to default values."""
        instance = self.get_object()
        
        # Delete and recreate to get defaults
        instance.delete()
        new_instance = SystemSettings.get_settings()
        
        # Log the reset action
        log_action(
            user=request.user,
            action='UPDATE',
            model_name='SystemSettings',
            object_id=new_instance.id,
            details={
                'action': 'reset_to_defaults',
                'reset_by': request.user.username
            },
            ip_address=get_client_ip(request)
        )
        
        serializer = self.get_serializer(new_instance)
        return Response(serializer.data)



class DatabaseBackupViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for database backup operations.
    Only Super Admins can create, view, and restore backups.
    """
    queryset = DatabaseBackup.objects.all()
    serializer_class = DatabaseBackupSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'backup_type']
    search_fields = ['filename']
    ordering_fields = ['created_at', 'file_size']
    ordering = ['-created_at']
    
    @action(detail=False, methods=['post'])
    def create_backup(self, request):
        """Create a new database backup."""
        try:
            backup = create_database_backup(user=request.user, backup_type='MANUAL')
            serializer = self.get_serializer(backup)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore database from a backup."""
        try:
            success, message = restore_database_backup(backup_id=pk, user=request.user)
            if success:
                return Response({'message': message})
            else:
                return Response(
                    {'error': message},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['delete'])
    def delete_backup(self, request, pk=None):
        """Delete a backup file and record."""
        import os
        
        try:
            backup = self.get_object()
            
            # Delete the file if it exists
            if os.path.exists(backup.file_path):
                os.remove(backup.file_path)
            
            # Log the deletion
            log_action(
                user=request.user,
                action='DELETE',
                model_name='DatabaseBackup',
                object_id=backup.id,
                details={
                    'filename': backup.filename,
                    'deleted_by': request.user.username
                },
                ip_address=get_client_ip(request)
            )
            
            # Delete the record
            backup.delete()
            
            return Response({'message': 'Backup deleted successfully'})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



class SystemHealthViewSet(viewsets.ViewSet):
    """
    ViewSet for system health monitoring.
    Only Super Admins can view system health.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """Get current system health status."""
        health_data = get_system_health()
        return Response(health_data)
    
    @action(detail=False, methods=['get'])
    def error_logs(self, request):
        """Get application error logs."""
        limit = int(request.query_params.get('limit', 100))
        level = request.query_params.get('level', None)
        search = request.query_params.get('search', None)
        
        logs = get_error_logs(limit=limit, level=level, search=search)
        
        return Response({
            'count': len(logs),
            'logs': logs
        })



class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user notifications.
    Users can only see their own notifications.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = LargeResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['read', 'notification_type']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Return only notifications for the current user."""
        return Notification.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None):
        """Mark a notification as read."""
        notification = self.get_object()
        notification.read = True
        notification.save()
        return Response(self.get_serializer(notification).data)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read for the current user."""
        count = Notification.objects.filter(user=request.user, read=False).update(read=True)
        return Response({'message': f'{count} notifications marked as read'})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications."""
        count = Notification.objects.filter(user=request.user, read=False).count()
        return Response({'unread_count': count})
