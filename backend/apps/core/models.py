from django.db import models
from django.conf import settings


class TimeStampedModel(models.Model):
    """Abstract base model with created and updated timestamps."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class AuditLog(models.Model):
    """Track all significant system actions."""
    ACTION_CHOICES = [
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('TRANSFER', 'Transfer'),
        ('ASSIGN', 'Assign'),
        ('STATUS_CHANGE', 'Status Change'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['model_name', 'object_id']),
        ]

    def __str__(self):
        return f"{self.user} - {self.action} - {self.model_name} - {self.timestamp}"


class SystemSettings(TimeStampedModel):
    """System-wide configuration settings. Only one instance should exist."""
    
    # General Settings
    system_name = models.CharField(max_length=200, default='DMU Property Management System')
    system_email = models.EmailField(default='admin@dmu.edu.et')
    timezone = models.CharField(max_length=50, default='Africa/Addis_Ababa')
    date_format = models.CharField(max_length=20, default='YYYY-MM-DD')
    
    # Maintenance Settings (SLA in hours)
    sla_emergency = models.IntegerField(default=24, help_text='SLA for emergency requests in hours')
    sla_high = models.IntegerField(default=72, help_text='SLA for high priority requests in hours')
    sla_medium = models.IntegerField(default=168, help_text='SLA for medium priority requests in hours')
    sla_low = models.IntegerField(default=336, help_text='SLA for low priority requests in hours')
    auto_assignment = models.BooleanField(default=True, help_text='Enable automatic technician assignment')
    preventive_maintenance = models.BooleanField(default=True, help_text='Enable preventive maintenance scheduling')
    
    # Notification Settings
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    notify_on_create = models.BooleanField(default=True)
    notify_on_assign = models.BooleanField(default=True)
    notify_on_complete = models.BooleanField(default=True)
    notify_on_overdue = models.BooleanField(default=True)
    
    # Security Settings
    password_min_length = models.IntegerField(default=8)
    password_require_uppercase = models.BooleanField(default=True)
    password_require_numbers = models.BooleanField(default=True)
    password_require_special = models.BooleanField(default=True)
    session_timeout = models.IntegerField(default=60, help_text='Session timeout in minutes')
    max_login_attempts = models.IntegerField(default=5)
    
    # File Upload Settings (sizes in MB)
    max_image_size = models.IntegerField(default=5, help_text='Maximum image size in MB')
    max_report_size = models.IntegerField(default=10, help_text='Maximum report size in MB')
    allowed_image_types = models.CharField(max_length=100, default='jpg, jpeg, png, gif')
    allowed_report_types = models.CharField(max_length=100, default='pdf, doc, docx, xls, xlsx')
    
    # Backup Settings
    auto_backup = models.BooleanField(default=True)
    backup_frequency = models.CharField(
        max_length=20, 
        default='daily',
        choices=[
            ('hourly', 'Hourly'),
            ('daily', 'Daily'),
            ('weekly', 'Weekly'),
            ('monthly', 'Monthly'),
        ]
    )
    backup_retention = models.IntegerField(default=30, help_text='Backup retention period in days')
    
    class Meta:
        verbose_name = 'System Settings'
        verbose_name_plural = 'System Settings'
    
    def __str__(self):
        return f"System Settings - {self.system_name}"
    
    def save(self, *args, **kwargs):
        """Ensure only one instance exists."""
        if not self.pk and SystemSettings.objects.exists():
            # If trying to create a new instance when one exists, update the existing one
            existing = SystemSettings.objects.first()
            self.pk = existing.pk
        super().save(*args, **kwargs)
    
    @classmethod
    def get_settings(cls):
        """Get or create the single settings instance."""
        settings, created = cls.objects.get_or_create(pk=1)
        return settings


class DatabaseBackup(TimeStampedModel):
    """Track database backup files."""
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]
    
    filename = models.CharField(max_length=255, unique=True)
    file_path = models.CharField(max_length=500)
    file_size = models.BigIntegerField(default=0, help_text='File size in bytes')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    backup_type = models.CharField(
        max_length=20,
        choices=[('MANUAL', 'Manual'), ('AUTOMATIC', 'Automatic')],
        default='MANUAL'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='backups_created'
    )
    error_message = models.TextField(blank=True, null=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.filename} - {self.status}"
    
    @property
    def file_size_mb(self):
        """Return file size in MB."""
        return round(self.file_size / (1024 * 1024), 2) if self.file_size else 0



class Notification(TimeStampedModel):
    """User notifications for system events."""
    NOTIFICATION_TYPES = [
        ('maintenance_request', 'Maintenance Request'),
        ('work_order', 'Work Order'),
        ('asset_assignment', 'Asset Assignment'),
        ('request_overdue', 'Request Overdue'),
        ('request_completed', 'Request Completed'),
        ('status_change', 'Status Change'),
        ('system', 'System Notification'),
        # Asset Assignment Request System
        ('asset_assignment_request', 'Asset Assignment Request'),
        ('asset_assignment_approved', 'Asset Assignment Approved'),
        ('asset_assignment_rejected', 'Asset Assignment Rejected'),
        ('asset_assignment_waitlisted', 'Asset Assignment Waitlisted'),
        ('asset_assignment_active', 'Asset Assignment Active'),
        ('asset_available', 'Asset Available'),
        ('asset_return_initiated', 'Asset Return Initiated'),
        ('asset_return_completed', 'Asset Return Completed'),
        # Asset Transfer System
        ('transfer_request', 'Transfer Request'),
        ('transfer_approval', 'Transfer Approval'),
        ('transfer_update', 'Transfer Update'),
        ('transfer_completed', 'Transfer Completed'),
        ('transfer_rejected', 'Transfer Rejected'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    link = models.CharField(max_length=500, blank=True, help_text="URL to navigate to when clicked")
    read = models.BooleanField(default=False)
    
    # Optional reference to related object
    related_model = models.CharField(max_length=100, blank=True)
    related_id = models.IntegerField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'read', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.title}"


# Import feedback models
from .feedback_models import ServiceRating, AssetFeedback, PortalSuggestion
