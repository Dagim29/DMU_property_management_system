"""
Serializers for Assignment Extension Requests
"""
from rest_framework import serializers
from .extension_models import AssignmentExtensionRequest
from .assignment_serializers import AssetAssignmentRequestListSerializer


class AssignmentExtensionRequestSerializer(serializers.ModelSerializer):
    """Serializer for assignment extension requests."""
    
    # Read-only fields
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    requested_by_email = serializers.EmailField(source='requested_by.email', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    asset_name = serializers.CharField(source='assignment.asset.name', read_only=True)
    asset_id = serializers.CharField(source='assignment.asset.asset_id', read_only=True)
    assignment_request_id = serializers.CharField(source='assignment.request_id', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    can_approve = serializers.BooleanField(read_only=True)
    can_reject = serializers.BooleanField(read_only=True)
    can_cancel = serializers.BooleanField(read_only=True)
    
    # Nested
    assignment_details = AssetAssignmentRequestListSerializer(source='assignment', read_only=True)
    
    class Meta:
        model = AssignmentExtensionRequest
        fields = [
            'id', 'extension_id', 'created_at', 'updated_at',
            'assignment', 'assignment_request_id', 'assignment_details',
            'requested_by', 'requested_by_name', 'requested_by_email', 'request_date',
            'status', 'status_display',
            'current_end_date', 'requested_new_end_date', 'extension_days',
            'reason', 'asset_name', 'asset_id',
            'reviewed_by', 'reviewed_by_name', 'review_date',
            'review_notes', 'rejection_reason',
            'approved_end_date', 'approved_days',
            'can_approve', 'can_reject', 'can_cancel'
        ]
        read_only_fields = [
            'id', 'extension_id', 'created_at', 'updated_at',
            'requested_by', 'request_date', 'extension_days',
            'reviewed_by', 'review_date', 'approved_end_date', 'approved_days',
            'requested_by_name', 'requested_by_email', 'reviewed_by_name', 'asset_name', 'asset_id',
            'assignment_request_id', 'status_display',
            'can_approve', 'can_reject', 'can_cancel', 'assignment_details'
        ]
    
    def validate(self, data):
        """Validate extension request data."""
        assignment = data.get('assignment', self.instance.assignment if self.instance else None)
        requested_new_end_date = data.get('requested_new_end_date')
        
        if not assignment:
            raise serializers.ValidationError({'assignment': 'Assignment is required'})
        
        # Check assignment is active
        if assignment.status != 'ACTIVE':
            raise serializers.ValidationError({
                'assignment': 'Can only request extension for active assignments'
            })
        
        # Check new end date is after current end date
        current_end_date = data.get('current_end_date', assignment.assignment_end_date)
        if requested_new_end_date <= current_end_date:
            raise serializers.ValidationError({
                'requested_new_end_date': 'New end date must be after current end date'
            })
        
        # Check extension is reasonable (max 90 days)
        from datetime import timedelta
        max_extension = current_end_date + timedelta(days=90)
        if requested_new_end_date > max_extension:
            raise serializers.ValidationError({
                'requested_new_end_date': 'Extension cannot exceed 90 days'
            })
        
        # Check no pending extension exists
        if not self.instance:  # Only for new requests
            pending_exists = AssignmentExtensionRequest.objects.filter(
                assignment=assignment,
                status='PENDING'
            ).exists()
            
            if pending_exists:
                raise serializers.ValidationError({
                    'assignment': 'A pending extension request already exists for this assignment'
                })
        
        return data
    
    def create(self, validated_data):
        """Create new extension request."""
        # Set current end date from assignment
        if 'current_end_date' not in validated_data:
            validated_data['current_end_date'] = validated_data['assignment'].assignment_end_date
        
        return super().create(validated_data)
