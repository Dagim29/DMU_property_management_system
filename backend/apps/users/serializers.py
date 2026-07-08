from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserSession, SecurityAlert, IPAccessControl, FailedLoginAttempt
from apps.core.models import SystemSettings

User = get_user_model()

def validate_password_strength(password):
    """Validate password against SystemSettings."""
    settings = SystemSettings.get_settings()
    
    if len(password) < settings.password_min_length:
        raise serializers.ValidationError(f"Password must be at least {settings.password_min_length} characters long.")
        
    if settings.password_require_uppercase and not any(c.isupper() for c in password):
        raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        
    if settings.password_require_numbers and not any(c.isdigit() for c in password):
        raise serializers.ValidationError("Password must contain at least one number.")
        
    if settings.password_require_special and not any(not c.isalnum() for c in password):
        raise serializers.ValidationError("Password must contain at least one special character.")
        
    return password


class UserSerializer(serializers.ModelSerializer):
    profile_photo_url = serializers.SerializerMethodField()
    certificate_file_url = serializers.SerializerMethodField()
    profile_photo = serializers.ImageField(required=False, allow_null=True, write_only=True)
    certificate_file = serializers.FileField(required=False, allow_null=True, write_only=True)
    password_expires_in_days = serializers.SerializerMethodField()
    days_since_last_activity = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password_strength])
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                  'role', 'department', 'phone', 'profile_photo', 'profile_photo_url', 
                  'specialization', 'assigned_campus', 'certifications', 'certificate_file', 'certificate_file_url', 'is_active', 'date_joined',
                  'last_activity', 'password_expires_at', 'password_expires_in_days',
                  'password_change_required', 'days_since_last_activity', 'password',
                  'performance_score', 'total_ratings', 'two_fa_enabled', 'two_fa_method',
                  'two_fa_enabled_at']
        read_only_fields = ['id', 'date_joined', 'last_activity', 'password_expires_at',
                           'password_expires_in_days', 'password_change_required',
                           'days_since_last_activity', 'performance_score', 'total_ratings',
                           'two_fa_enabled', 'two_fa_method', 'two_fa_enabled_at']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }
    
    def get_profile_photo_url(self, obj):
        if obj.profile_photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_photo.url)
            return obj.profile_photo.url
        return None

    def get_certificate_file_url(self, obj):
        if obj.certificate_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.certificate_file.url)
            return obj.certificate_file.url
        return None
    
    def get_password_expires_in_days(self, obj):
        return obj.days_until_password_expires()
    
    def get_days_since_last_activity(self, obj):
        return obj.days_since_last_activity()
    
    def update(self, instance, validated_data):
        """Handle password hashing on update."""
        password = validated_data.pop('password', None)
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Handle password separately to ensure it's hashed
        if password:
            instance.set_password(password)
            # Set password expiry when password is changed
            instance.set_password_expiry()
        
        instance.save()
        return instance
    
    def to_representation(self, instance):
        """Customize output to use profile_photo instead of profile_photo_url"""
        representation = super().to_representation(instance)
        # Move profile_photo_url to profile_photo for backward compatibility
        representation['profile_photo'] = representation.pop('profile_photo_url')
        representation['certificate_file'] = representation.pop('certificate_file_url', None)
        return representation


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password_strength])
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name',
                  'role', 'department', 'phone', 'specialization', 'assigned_campus', 'certifications', 'certificate_file']
    
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        # Set initial password expiry
        user.set_password_expiry()
        # Set initial last activity
        from django.utils import timezone
        user.last_activity = timezone.now()
        user.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password_strength])


class UserSessionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    duration = serializers.SerializerMethodField()
    
    class Meta:
        model = UserSession
        fields = ['id', 'user', 'username', 'user_email', 'session_key', 
                  'ip_address', 'user_agent', 'device_info', 'location',
                  'login_time', 'last_activity', 'is_active', 'duration']
        read_only_fields = ['id', 'login_time', 'last_activity']
    
    def get_duration(self, obj):
        """Get session duration in minutes."""
        from django.utils import timezone
        if obj.is_active:
            delta = timezone.now() - obj.login_time
        else:
            delta = obj.last_activity - obj.login_time
        return int(delta.total_seconds() / 60)


class SecurityAlertSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    acknowledged_by_username = serializers.CharField(source='acknowledged_by.username', read_only=True)
    alert_type_display = serializers.CharField(source='get_alert_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    
    class Meta:
        model = SecurityAlert
        fields = ['id', 'user', 'username', 'alert_type', 'alert_type_display',
                  'severity', 'severity_display', 'message', 'ip_address', 'details',
                  'created_at', 'acknowledged', 'acknowledged_by', 'acknowledged_by_username',
                  'acknowledged_at']
        read_only_fields = ['id', 'created_at', 'acknowledged_by', 'acknowledged_at']



class IPAccessControlSerializer(serializers.ModelSerializer):
    added_by_username = serializers.CharField(source='added_by.username', read_only=True)
    added_by_full_name = serializers.SerializerMethodField()
    list_type_display = serializers.CharField(source='get_list_type_display', read_only=True)
    
    class Meta:
        model = IPAccessControl
        fields = ['id', 'ip_address', 'list_type', 'list_type_display', 'description',
                  'added_by', 'added_by_username', 'added_by_full_name', 'added_at',
                  'last_used', 'block_count', 'country', 'city', 'is_active']
        read_only_fields = ['id', 'added_by', 'added_at', 'last_used', 'block_count']
    
    def get_added_by_full_name(self, obj):
        if obj.added_by:
            return obj.added_by.get_full_name() or obj.added_by.username
        return 'System'


class FailedLoginAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = FailedLoginAttempt
        fields = ['id', 'username', 'ip_address', 'user_agent', 'attempt_time',
                  'reason', 'country', 'city']
        read_only_fields = ['id', 'attempt_time']


class IPAccessControlBulkSerializer(serializers.Serializer):
    """Serializer for bulk import of IP access control rules."""
    whitelist = IPAccessControlSerializer(many=True, required=False)
    blacklist = IPAccessControlSerializer(many=True, required=False)
