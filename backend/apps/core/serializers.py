from rest_framework import serializers
from .models import AuditLog, SystemSettings, DatabaseBackup, Notification
from django.contrib.auth import get_user_model

User = get_user_model()


class AuditLogUserSerializer(serializers.ModelSerializer):
    """Simplified user serializer for audit logs."""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for audit log entries."""
    user = AuditLogUserSerializer(read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id',
            'user',
            'action',
            'action_display',
            'model_name',
            'object_id',
            'details',
            'ip_address',
            'timestamp'
        ]
        read_only_fields = fields


class SystemSettingsSerializer(serializers.ModelSerializer):
    """Serializer for system settings."""
    
    class Meta:
        model = SystemSettings
        fields = [
            'id',
            # General
            'system_name',
            'system_email',
            'timezone',
            'date_format',
            # Maintenance
            'sla_emergency',
            'sla_high',
            'sla_medium',
            'sla_low',
            'auto_assignment',
            'preventive_maintenance',
            # Notifications
            'email_notifications',
            'sms_notifications',
            'notify_on_create',
            'notify_on_assign',
            'notify_on_complete',
            'notify_on_overdue',
            # Security
            'password_min_length',
            'password_require_uppercase',
            'password_require_numbers',
            'password_require_special',
            'session_timeout',
            'max_login_attempts',
            # File Upload
            'max_image_size',
            'max_report_size',
            'allowed_image_types',
            'allowed_report_types',
            # Backup
            'auto_backup',
            'backup_frequency',
            'backup_retention',
            # Timestamps
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_password_min_length(self, value):
        """Ensure password minimum length is reasonable."""
        if value < 6:
            raise serializers.ValidationError("Password minimum length must be at least 6 characters.")
        if value > 32:
            raise serializers.ValidationError("Password minimum length cannot exceed 32 characters.")
        return value
    
    def validate_session_timeout(self, value):
        """Ensure session timeout is reasonable."""
        if value < 5:
            raise serializers.ValidationError("Session timeout must be at least 5 minutes.")
        if value > 1440:  # 24 hours
            raise serializers.ValidationError("Session timeout cannot exceed 24 hours (1440 minutes).")
        return value


class DatabaseBackupSerializer(serializers.ModelSerializer):
    """Serializer for database backups."""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    file_size_mb = serializers.FloatField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    backup_type_display = serializers.CharField(source='get_backup_type_display', read_only=True)
    
    class Meta:
        model = DatabaseBackup
        fields = [
            'id',
            'filename',
            'file_size',
            'file_size_mb',
            'status',
            'status_display',
            'backup_type',
            'backup_type_display',
            'created_by',
            'created_by_username',
            'error_message',
            'created_at',
            'completed_at',
        ]
        read_only_fields = fields



class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for user notifications."""
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = ['id', 'notification_type', 'notification_type_display', 'title', 'message', 
                  'link', 'read', 'related_model', 'related_id', 'created_at', 'time_ago']
        read_only_fields = ['id', 'created_at']
    
    def get_time_ago(self, obj):
        """Calculate human-readable time ago."""
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff < timedelta(minutes=1):
            return "Just now"
        elif diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f"{minutes}m ago"
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f"{hours}h ago"
        elif diff < timedelta(days=7):
            days = diff.days
            return f"{days}d ago"
        else:
            return obj.created_at.strftime('%b %d, %Y')



# Feedback System Serializers
from .feedback_models import ServiceRating, AssetFeedback, PortalSuggestion


class ServiceRatingSerializer(serializers.ModelSerializer):
    """Serializer for service ratings."""
    rated_by_name = serializers.CharField(source='rated_by.get_full_name', read_only=True)
    maintenance_request_id = serializers.CharField(source='maintenance_request.request_id', read_only=True)
    responded_by_name = serializers.CharField(source='responded_by.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = ServiceRating
        fields = [
            'id',
            'maintenance_request',
            'maintenance_request_id',
            'rated_by',
            'rated_by_name',
            'overall_rating',
            'timeliness_rating',
            'quality_rating',
            'communication_rating',
            'feedback_text',
            'is_anonymous',
            'response_text',
            'responded_by',
            'responded_by_name',
            'responded_at',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'rated_by', 'responded_by', 'responded_at', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate rating values."""
        rating_fields = ['overall_rating', 'timeliness_rating', 'quality_rating', 'communication_rating']
        for field in rating_fields:
            if field in data:
                value = data[field]
                if value < 1 or value > 5:
                    raise serializers.ValidationError({field: f"Rating must be between 1 and 5, got {value}"})
        return data
    
    def validate_maintenance_request(self, value):
        """Ensure maintenance request is completed and not already rated."""
        if value.status != 'COMPLETED':
            raise serializers.ValidationError("Can only rate completed maintenance requests")
        
        # Use try/except to handle the reverse OneToOne relation safely
        try:
            _ = value.service_rating
            raise serializers.ValidationError("This maintenance request has already been rated")
        except value.__class__.service_rating.RelatedObjectDoesNotExist:
            pass
        
        return value


class AssetFeedbackSerializer(serializers.ModelSerializer):
    """Serializer for asset feedback."""
    submitted_by_name = serializers.CharField(source='submitted_by.get_full_name', read_only=True)
    asset_id = serializers.CharField(source='asset.asset_id', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    responded_by_name = serializers.CharField(source='responded_by.get_full_name', read_only=True, allow_null=True)
    feedback_type_display = serializers.CharField(source='get_feedback_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = AssetFeedback
        fields = [
            'id',
            'asset',
            'asset_id',
            'asset_name',
            'submitted_by',
            'submitted_by_name',
            'feedback_type',
            'feedback_type_display',
            'description',
            'photos',
            'status',
            'status_display',
            'response_text',
            'responded_by',
            'responded_by_name',
            'responded_at',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'submitted_by', 'status', 'response_text', 'responded_by', 'responded_at', 'created_at', 'updated_at']


class PortalSuggestionSerializer(serializers.ModelSerializer):
    """Serializer for portal suggestions."""
    submitted_by_name = serializers.CharField(source='submitted_by.get_full_name', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    user_voted = serializers.SerializerMethodField()
    
    class Meta:
        model = PortalSuggestion
        fields = [
            'id',
            'submitted_by',
            'submitted_by_name',
            'category',
            'category_display',
            'title',
            'description',
            'priority',
            'priority_display',
            'screenshots',
            'status',
            'status_display',
            'votes',
            'user_voted',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'submitted_by', 'status', 'votes', 'created_at', 'updated_at']
    
    def get_user_voted(self, obj):
        """Check if current user has voted for this suggestion."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.voters.filter(id=request.user.id).exists()
        return False
