from apps.core.models import AuditLog


def log_action(user, action, model_name, object_id, details=None, ip_address=None):
    """Helper function to create audit log entries. user and object_id may be None."""
    try:
        AuditLog.objects.create(
            user=user,  # FK allows null for anonymous actions
            action=action,
            model_name=model_name,
            object_id=str(object_id) if object_id is not None else '',
            details=details or {},
            ip_address=ip_address
        )
    except Exception:
        pass  # Never let audit logging crash the main request


def get_client_ip(request):
    """Extract client IP from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def create_database_backup(user=None, backup_type='MANUAL'):
    """
    Create a database backup using Django's dumpdata.
    Returns the DatabaseBackup instance.
    """
    import subprocess
    import os
    import json
    from datetime import datetime
    from django.conf import settings as django_settings
    from django.core.management import call_command
    from io import StringIO
    from .models import DatabaseBackup
    
    # Create backups directory if it doesn't exist
    backup_dir = os.path.join(django_settings.BASE_DIR, 'backups')
    os.makedirs(backup_dir, exist_ok=True)
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"backup_{timestamp}.json"
    file_path = os.path.join(backup_dir, filename)
    
    # Create backup record
    backup = DatabaseBackup.objects.create(
        filename=filename,
        file_path=file_path,
        status='IN_PROGRESS',
        backup_type=backup_type,
        created_by=user
    )
    
    try:
        # Use Django's dumpdata command
        with open(file_path, 'w', encoding='utf-8') as f:
            call_command(
                'dumpdata',
                '--natural-foreign',
                '--natural-primary',
                '--indent', '2',
                stdout=f
            )
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        # Update backup record
        backup.status = 'COMPLETED'
        backup.file_size = file_size
        backup.completed_at = datetime.now()
        backup.save()
        
        # Log the action
        if user:
            log_action(
                user=user,
                action='CREATE',
                model_name='DatabaseBackup',
                object_id=backup.id,
                details={
                    'filename': filename,
                    'size_mb': backup.file_size_mb,
                    'type': backup_type
                }
            )
        
        return backup
            
    except Exception as e:
        backup.status = 'FAILED'
        backup.error_message = str(e)
        backup.save()
        
        # Clean up failed backup file
        if os.path.exists(file_path):
            os.remove(file_path)
        
        raise


def restore_database_backup(backup_id, user=None):
    """
    Restore database from a backup file using Django's loaddata.
    Returns success status and message.
    """
    import os
    from django.core.management import call_command
    from .models import DatabaseBackup
    
    try:
        backup = DatabaseBackup.objects.get(id=backup_id)
        
        if backup.status != 'COMPLETED':
            raise Exception("Cannot restore from incomplete backup")
        
        if not os.path.exists(backup.file_path):
            raise Exception("Backup file not found")
        
        # Use Django's loaddata command
        call_command('loaddata', backup.file_path)
        
        # Log the action
        if user:
            log_action(
                user=user,
                action='UPDATE',
                model_name='DatabaseBackup',
                object_id=backup.id,
                details={
                    'action': 'restore',
                    'filename': backup.filename,
                    'restored_by': user.username
                }
            )
        
        return True, "Database restored successfully"
            
    except Exception as e:
        return False, str(e)



def get_system_health():
    """
    Get comprehensive system health metrics.
    Returns dict with disk, memory, CPU, database, and session info.
    """
    import psutil
    import os
    from django.conf import settings as django_settings
    from django.contrib.sessions.models import Session
    from django.contrib.auth import get_user_model
    from django.db import connection
    from datetime import datetime, timedelta
    
    User = get_user_model()
    
    try:
        # Disk usage
        disk = psutil.disk_usage('/')
        disk_info = {
            'total_gb': round(disk.total / (1024**3), 2),
            'used_gb': round(disk.used / (1024**3), 2),
            'free_gb': round(disk.free / (1024**3), 2),
            'percent': disk.percent
        }
        
        # Memory usage
        memory = psutil.virtual_memory()
        memory_info = {
            'total_gb': round(memory.total / (1024**3), 2),
            'used_gb': round(memory.used / (1024**3), 2),
            'available_gb': round(memory.available / (1024**3), 2),
            'percent': memory.percent
        }
        
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        cpu_info = {
            'percent': cpu_percent,
            'count': cpu_count,
            'per_cpu': psutil.cpu_percent(interval=1, percpu=True)
        }
        
        # Database info
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_database_size(current_database())")
            db_size = cursor.fetchone()[0]
        
        db_info = {
            'size_mb': round(db_size / (1024**2), 2),
            'size_gb': round(db_size / (1024**3), 2)
        }
        
        # Active sessions (last 30 minutes)
        thirty_min_ago = datetime.now() - timedelta(minutes=30)
        active_sessions = Session.objects.filter(
            expire_date__gte=datetime.now()
        ).count()
        
        # Active users (logged in within last hour)
        one_hour_ago = datetime.now() - timedelta(hours=1)
        from .models import AuditLog
        recent_logins = AuditLog.objects.filter(
            action='LOGIN',
            timestamp__gte=one_hour_ago
        ).values('user').distinct().count()
        
        # Total users
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        
        user_info = {
            'total': total_users,
            'active': active_users,
            'inactive': total_users - active_users,
            'active_sessions': active_sessions,
            'recent_logins': recent_logins
        }
        
        # System uptime
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        uptime_seconds = (datetime.now() - boot_time).total_seconds()
        uptime_days = int(uptime_seconds // 86400)
        uptime_hours = int((uptime_seconds % 86400) // 3600)
        
        system_info = {
            'uptime_days': uptime_days,
            'uptime_hours': uptime_hours,
            'boot_time': boot_time.isoformat()
        }
        
        # Health status
        health_status = 'healthy'
        warnings = []
        
        if disk.percent > 90:
            health_status = 'critical'
            warnings.append('Disk usage above 90%')
        elif disk.percent > 80:
            health_status = 'warning'
            warnings.append('Disk usage above 80%')
        
        if memory.percent > 90:
            health_status = 'critical'
            warnings.append('Memory usage above 90%')
        elif memory.percent > 80:
            if health_status == 'healthy':
                health_status = 'warning'
            warnings.append('Memory usage above 80%')
        
        if cpu_percent > 90:
            health_status = 'critical'
            warnings.append('CPU usage above 90%')
        elif cpu_percent > 80:
            if health_status == 'healthy':
                health_status = 'warning'
            warnings.append('CPU usage above 80%')
        
        return {
            'status': health_status,
            'warnings': warnings,
            'disk': disk_info,
            'memory': memory_info,
            'cpu': cpu_info,
            'database': db_info,
            'users': user_info,
            'system': system_info,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }


def get_error_logs(limit=100, level=None, search=None):
    """
    Get application error logs from Django's logging.
    Returns list of error log entries.
    """
    import os
    from django.conf import settings as django_settings
    from datetime import datetime
    
    logs = []
    log_file = os.path.join(django_settings.BASE_DIR, 'logs', 'django.log')
    
    # Create logs directory if it doesn't exist
    os.makedirs(os.path.dirname(log_file), exist_ok=True)
    
    if not os.path.exists(log_file):
        return logs
    
    try:
        with open(log_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Parse log lines (simple parsing)
        for line in reversed(lines[-limit*10:]):  # Get more lines to filter
            line = line.strip()
            if not line:
                continue
            
            # Filter by level if specified
            if level and level.upper() not in line:
                continue
            
            # Filter by search term if specified
            if search and search.lower() not in line.lower():
                continue
            
            # Parse log line (basic parsing)
            parts = line.split(' - ', 3)
            if len(parts) >= 3:
                log_entry = {
                    'timestamp': parts[0] if len(parts) > 0 else '',
                    'level': parts[1] if len(parts) > 1 else 'INFO',
                    'logger': parts[2] if len(parts) > 2 else '',
                    'message': parts[3] if len(parts) > 3 else line
                }
                logs.append(log_entry)
            
            if len(logs) >= limit:
                break
        
        return logs
        
    except Exception as e:
        return [{'error': str(e), 'timestamp': datetime.now().isoformat()}]



def create_notification(user, notification_type, title, message, link='', related_model='', related_id=None):
    """
    Create a notification for a user.
    
    Args:
        user: User object to notify
        notification_type: Type of notification (from Notification.NOTIFICATION_TYPES)
        title: Notification title
        message: Notification message
        link: Optional URL to navigate to
        related_model: Optional related model name
        related_id: Optional related object ID
    
    Returns:
        Notification object
    """
    from .models import Notification
    
    notification = Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        link=link,
        related_model=related_model,
        related_id=related_id
    )
    
    return notification


def notify_maintenance_request_created(request_obj):
    """Notify relevant users when a maintenance request is created."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    # Notify supervisors
    supervisors = User.objects.filter(role='MAINTENANCE_SUPERVISOR', is_active=True)
    for supervisor in supervisors:
        create_notification(
            user=supervisor,
            notification_type='maintenance_request',
            title='New Maintenance Request',
            message=f'Request {request_obj.request_id} has been submitted for {request_obj.asset.asset_id}',
            link=f'/dashboard/maintenance/requests/{request_obj.id}',
            related_model='MaintenanceRequest',
            related_id=request_obj.id
        )
    
    # Notify assigned technician if auto-assigned
    if request_obj.assigned_to:
        create_notification(
            user=request_obj.assigned_to,
            notification_type='work_order',
            title='New Work Order Assigned',
            message=f'You have been assigned to request {request_obj.request_id}',
            link=f'/dashboard/maintenance/requests/{request_obj.id}',
            related_model='MaintenanceRequest',
            related_id=request_obj.id
        )


def notify_request_completed(request_obj):
    """Notify requester when their maintenance request is completed."""
    if request_obj.requested_by:
        create_notification(
            user=request_obj.requested_by,
            notification_type='request_completed',
            title='Request Completed',
            message=f'Your maintenance request {request_obj.request_id} has been completed',
            link=f'/dashboard/maintenance/requests/{request_obj.id}',
            related_model='MaintenanceRequest',
            related_id=request_obj.id
        )


def notify_request_overdue(request_obj):
    """Notify relevant users when a request becomes overdue."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    # Notify assigned technician
    if request_obj.assigned_to:
        create_notification(
            user=request_obj.assigned_to,
            notification_type='request_overdue',
            title='Request Overdue',
            message=f'Request {request_obj.request_id} is now overdue',
            link=f'/dashboard/maintenance/requests/{request_obj.id}',
            related_model='MaintenanceRequest',
            related_id=request_obj.id
        )
    
    # Notify supervisors
    supervisors = User.objects.filter(role='MAINTENANCE_SUPERVISOR', is_active=True)
    for supervisor in supervisors:
        create_notification(
            user=supervisor,
            notification_type='request_overdue',
            title='Request Overdue',
            message=f'Request {request_obj.request_id} is now overdue',
            link=f'/dashboard/maintenance/requests/{request_obj.id}',
            related_model='MaintenanceRequest',
            related_id=request_obj.id
        )
