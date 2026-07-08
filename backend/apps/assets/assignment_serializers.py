"""
Serializers for Asset Assignment Request System
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .assignment_models import AssetAssignmentRequest, AssetWaitlist, AssignmentRequestHistory
from .models import Asset
from .serializers import AssetSerializer
from .validators import AssignmentDateValidator, ConditionDocumentationValidator

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user information for assignment requests."""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'role']
        read_only_fields = fields


class AssignmentRequestHistorySerializer(serializers.ModelSerializer):
    """Serializer for assignment request history/audit trail."""
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = AssignmentRequestHistory
        fields = [
            'id', 'action', 'action_display', 'action_date', 'performed_by',
            'performed_by_name', 'old_status', 'new_status', 'notes', 'metadata'
        ]
        read_only_fields = fields


class AssetWaitlistSerializer(serializers.ModelSerializer):
    """Serializer for asset waitlist entries."""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    asset_id = serializers.CharField(source='asset.asset_id', read_only=True)
    days_waiting = serializers.SerializerMethodField()
    
    class Meta:
        model = AssetWaitlist
        fields = [
            'id', 'asset', 'asset_id', 'asset_name', 'user', 'user_name',
            'position', 'added_date', 'status', 'notification_sent',
            'notification_date', 'response_deadline', 'expires_at',
            'days_waiting'
        ]
        read_only_fields = [
            'id', 'added_date', 'notification_sent', 'notification_date',
            'response_deadline', 'days_waiting'
        ]
    
    def get_days_waiting(self, obj):
        """Calculate days in waitlist."""
        from django.utils import timezone
        delta = timezone.now() - obj.added_date
        return delta.days


class AssetAssignmentRequestSerializer(serializers.ModelSerializer):
    """Main serializer for asset assignment requests."""
    
    # Read-only computed fields
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    requested_by_email = serializers.EmailField(source='requested_by.email', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    asset_id_display = serializers.CharField(source='asset.asset_id', read_only=True)
    asset_status = serializers.CharField(source='asset.status', read_only=True)
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    assignment_type_display = serializers.CharField(source='get_assignment_type_display', read_only=True)
    
    days_until_due = serializers.IntegerField(read_only=True)
    can_cancel = serializers.BooleanField(read_only=True)
    can_return = serializers.BooleanField(read_only=True)
    is_temporary = serializers.BooleanField(read_only=True)
    
    # Nested serializers
    asset_details = AssetSerializer(source='asset', read_only=True)
    requested_by_details = UserBasicSerializer(source='requested_by', read_only=True)
    reviewed_by_details = UserBasicSerializer(source='reviewed_by', read_only=True)
    waitlist_entry = AssetWaitlistSerializer(read_only=True)
    history = AssignmentRequestHistorySerializer(many=True, read_only=True)
    
    class Meta:
        model = AssetAssignmentRequest
        fields = [
            # Identification
            'id', 'request_id', 'created_at', 'updated_at',
            
            # Core Information
            'asset', 'asset_name', 'asset_id_display', 'asset_status', 'asset_details',
            'requested_by', 'requested_by_name', 'requested_by_email', 'requested_by_details',
            'request_date', 'status', 'status_display', 'priority', 'priority_display',
            
            # Request Details
            'purpose', 'assignment_type', 'assignment_type_display',
            'requested_start_date', 'requested_end_date',
            'department', 'project_name',
            
            # Manager Review
            'reviewed_by', 'reviewed_by_name', 'reviewed_by_details',
            'review_date', 'review_notes', 'rejection_reason',
            
            # Waitlist
            'waitlist_position', 'waitlist_added_date', 'estimated_available_date',
            'notify_when_available', 'waitlist_notified', 'waitlist_notification_date',
            'waitlist_response_deadline', 'waitlist_entry',
            
            # Assignment Details
            'assignment_start_date', 'assignment_end_date', 'actual_return_date',
            
            # Condition Documentation
            'assignment_condition', 'return_condition',
            'assignment_condition_notes', 'return_condition_notes',
            'handover_photos', 'return_photos',
            
            # Compliance
            'terms_accepted', 'terms_accepted_date', 'user_signature',
            'training_required', 'training_completed', 'training_completed_date',
            
            # Notifications
            'user_notified', 'manager_notified', 'reminder_sent_count', 'last_reminder_date',
            
            # Metadata
            'is_overdue', 'overdue_days', 'days_until_due',
            'can_cancel', 'can_return', 'is_temporary',
            
            # Nested
            'history'
        ]
        read_only_fields = [
            'id', 'request_id', 'created_at', 'updated_at', 'request_date',
            'requested_by', 'reviewed_by', 'review_date', 'waitlist_position', 'waitlist_added_date',
            'assignment_start_date', 'actual_return_date', 'user_notified',
            'manager_notified', 'reminder_sent_count', 'last_reminder_date',
            'is_overdue', 'overdue_days', 'waitlist_notified',
            'waitlist_notification_date', 'waitlist_response_deadline',
            # Display fields
            'requested_by_name', 'requested_by_email', 'reviewed_by_name',
            'asset_name', 'asset_id_display', 'asset_status',
            'status_display', 'priority_display', 'assignment_type_display',
            'days_until_due', 'can_cancel', 'can_return', 'is_temporary',
            'asset_details', 'requested_by_details', 'reviewed_by_details',
            'waitlist_entry', 'history'
        ]
    
    def validate(self, data):
        """Validate assignment request data with enhanced validators."""
        assignment_type = data.get('assignment_type', self.instance.assignment_type if self.instance else None)
        requested_start_date = data.get('requested_start_date', self.instance.requested_start_date if self.instance else None)
        requested_end_date = data.get('requested_end_date', self.instance.requested_end_date if self.instance else None)
        
        # Use enhanced date validator
        try:
            if requested_start_date:
                AssignmentDateValidator.validate_start_date(requested_start_date, assignment_type)
            
            if requested_end_date or assignment_type == 'TEMPORARY':
                AssignmentDateValidator.validate_end_date(
                    requested_start_date, 
                    requested_end_date, 
                    assignment_type
                )
        except Exception as e:
            raise serializers.ValidationError({'dates': str(e)})
        
        return data
    
    def create(self, validated_data):
        """Create new assignment request."""
        # requested_by should be passed from perform_create in the view
        # If not present, try to get from context (fallback)
        if 'requested_by' not in validated_data:
            if 'request' in self.context:
                validated_data['requested_by'] = self.context['request'].user
            else:
                raise serializers.ValidationError({'requested_by': 'User information is required'})
        
        # Create the request
        instance = super().create(validated_data)
        
        # Create history entry
        AssignmentRequestHistory.objects.create(
            request=instance,
            action='CREATED',
            performed_by=instance.requested_by,
            new_status=instance.status,
            notes=f"Request created for {instance.asset.asset_id}"
        )
        
        return instance


class AssetAssignmentRequestListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    asset_id_display = serializers.CharField(source='asset.asset_id', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    assignment_type_display = serializers.CharField(source='get_assignment_type_display', read_only=True)
    days_until_due = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = AssetAssignmentRequest
        fields = [
            'id', 'request_id', 'asset', 'asset_name', 'asset_id_display',
            'requested_by', 'requested_by_name', 'request_date',
            'status', 'status_display', 'priority', 'priority_display',
            'assignment_type', 'assignment_type_display', 'requested_start_date', 'requested_end_date',
            'reviewed_by_name', 'review_date', 'waitlist_position',
            'is_overdue', 'overdue_days', 'days_until_due'
        ]
        read_only_fields = fields


class AssetAvailabilitySerializer(serializers.Serializer):
    """Serializer for asset availability check response."""
    asset_id = serializers.CharField()
    asset_name = serializers.CharField()
    is_available = serializers.BooleanField()
    availability_status = serializers.CharField()
    current_status = serializers.CharField()
    estimated_available_date = serializers.DateField(allow_null=True)
    waitlist_count = serializers.IntegerField()
    can_request = serializers.BooleanField()
    message = serializers.CharField()
    current_assignment = serializers.DictField(allow_null=True)
