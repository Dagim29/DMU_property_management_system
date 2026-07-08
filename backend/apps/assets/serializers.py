from rest_framework import serializers
from .models import (Campus, Building, Floor, Room, Asset, AssetTransfer, 
                     AssetWarranty, AssetInsurance, AssetCheckout, AssetDocument,
                     Budget, BudgetTransaction, AssetEvent, CheckoutExtensionRequest)


class CampusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campus
        fields = '__all__'


class BuildingSerializer(serializers.ModelSerializer):
    campus_name = serializers.CharField(source='campus.name', read_only=True)
    
    class Meta:
        model = Building
        fields = '__all__'


class FloorSerializer(serializers.ModelSerializer):
    building_name = serializers.CharField(source='building.name', read_only=True)
    
    class Meta:
        model = Floor
        fields = '__all__'


class RoomSerializer(serializers.ModelSerializer):
    floor_info = serializers.CharField(source='__str__', read_only=True)
    
    class Meta:
        model = Room
        fields = '__all__'


class AssetSerializer(serializers.ModelSerializer):
    campus_name = serializers.CharField(source='campus.name', read_only=True)
    room_info = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Asset
        fields = '__all__'
        read_only_fields = ['asset_id', 'qr_code']
    
    def get_room_info(self, obj):
        return str(obj.room) if obj.room else None
    
    def get_assigned_to_name(self, obj):
        return obj.assigned_to.get_full_name() if obj.assigned_to else None
        
    def validate(self, data):
        """Validate asset data for duplicates based on similar fields."""
        name = data.get('name')
        asset_type = data.get('asset_type')
        campus = data.get('campus')
        room = data.get('room')
        manufacturer = data.get('manufacturer')
        model_number = data.get('model_number')
        serial_number = data.get('serial_number')

        # Only perform similar field check if there's no serial number
        # because serial number is the absolute primary source of uniqueness
        if name and asset_type and campus and not serial_number:
            from .models import Asset
            duplicates = Asset.objects.filter(
                name__iexact=name,
                asset_type=asset_type,
                campus=campus
            )
            
            if manufacturer:
                duplicates = duplicates.filter(manufacturer__iexact=manufacturer)
            if model_number:
                duplicates = duplicates.filter(model_number__iexact=model_number)
            if room:
                duplicates = duplicates.filter(room=room)

            if self.instance:
                duplicates = duplicates.exclude(pk=self.instance.pk)

            if duplicates.exists():
                raise serializers.ValidationError({
                    'non_field_errors': "A very similar asset (same name, type, campus, and manufacturer) already exists. Please verify to avoid duplication."
                })
        return data


class AssetTransferSerializer(serializers.ModelSerializer):
    asset_id = serializers.CharField(source='asset.asset_id', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    from_room_info = serializers.SerializerMethodField()
    to_room_info = serializers.SerializerMethodField()
    transferred_by_name = serializers.CharField(source='transferred_by.get_full_name', read_only=True)
    
    # Campus information
    source_campus_name = serializers.ReadOnlyField()
    dest_campus_name = serializers.ReadOnlyField()
    
    # Display fields
    transfer_type_display = serializers.CharField(source='get_transfer_type_display', read_only=True)
    reason_category_display = serializers.CharField(source='get_reason_category_display', read_only=True)
    approval_status_display = serializers.CharField(source='get_approval_status_display', read_only=True)
    transportation_method_display = serializers.CharField(source='get_transportation_method_display', read_only=True)
    
    class Meta:
        model = AssetTransfer
        fields = [
            'id', 'asset', 'asset_id', 'asset_name',
            'from_room', 'from_room_info', 'to_room', 'to_room_info',
            'source_campus_name', 'dest_campus_name',
            'transfer_date', 'completed_date', 'reason', 
            'transfer_type', 'transfer_type_display',
            'reason_category', 'reason_category_display',
            'scheduled_date', 'transportation_method', 'transportation_method_display',
            'special_requirements', 'notes',
            'transferred_by', 'transferred_by_name',
            'approval_status', 'approval_status_display',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'transfer_date', 'completed_date', 'transferred_by', 'approval_status'
        ]
    
    def validate(self, data):
        """Validate transfer data."""
        # Ensure to_room is provided
        if not data.get('to_room'):
            raise serializers.ValidationError({'to_room': 'Destination room is required'})
        
        # Ensure asset is provided
        if not data.get('asset'):
            raise serializers.ValidationError({'asset': 'Asset is required'})
        
        return data
    
    def get_from_room_info(self, obj):
        if obj.from_room:
            try:
                building_name = obj.from_room.floor.building.name if obj.from_room.floor and obj.from_room.floor.building else 'Unknown Building'
                return f"{building_name} - Room {obj.from_room.number}"
            except AttributeError:
                return f"Room {obj.from_room.number}"
        return None
    
    def get_to_room_info(self, obj):
        if obj.to_room:
            try:
                building_name = obj.to_room.floor.building.name if obj.to_room.floor and obj.to_room.floor.building else 'Unknown Building'
                return f"{building_name} - Room {obj.to_room.number}"
            except AttributeError:
                return f"Room {obj.to_room.number}"
        return None



class AssetWarrantySerializer(serializers.ModelSerializer):
    asset_id = serializers.CharField(source='asset.asset_id', read_only=True)
    is_active = serializers.SerializerMethodField()
    days_until_expiry = serializers.SerializerMethodField()
    
    class Meta:
        model = AssetWarranty
        fields = '__all__'
    
    def get_is_active(self, obj):
        return obj.is_active()
    
    def get_days_until_expiry(self, obj):
        return obj.days_until_expiry()


class AssetInsuranceSerializer(serializers.ModelSerializer):
    asset_id = serializers.CharField(source='asset.asset_id', read_only=True)
    is_active = serializers.SerializerMethodField()
    days_until_renewal = serializers.SerializerMethodField()
    
    class Meta:
        model = AssetInsurance
        fields = '__all__'
    
    def get_is_active(self, obj):
        return obj.is_active()
    
    def get_days_until_renewal(self, obj):
        return obj.days_until_renewal()


class AssetCheckoutSerializer(serializers.ModelSerializer):
    asset_id = serializers.CharField(source='asset.asset_id', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    checked_out_to_name = serializers.CharField(source='checked_out_to.get_full_name', read_only=True)
    checked_out_by_name = serializers.CharField(source='checked_out_by.get_full_name', read_only=True)
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = AssetCheckout
        fields = '__all__'
    
    def get_is_overdue(self, obj):
        return obj.is_overdue()


class CheckoutExtensionRequestSerializer(serializers.ModelSerializer):
    """Serializer for checkout extension requests."""
    checkout_asset_id = serializers.CharField(source='checkout.asset.asset_id', read_only=True)
    checkout_asset_name = serializers.CharField(source='checkout.asset.name', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    checked_out_to_name = serializers.CharField(source='checkout.checked_out_to.get_full_name', read_only=True)
    days_extension = serializers.SerializerMethodField()
    
    class Meta:
        model = CheckoutExtensionRequest
        fields = '__all__'
        read_only_fields = ['requested_by', 'request_date', 'reviewed_by', 'review_date', 'status']
    
    def get_days_extension(self, obj):
        """Calculate number of days being requested for extension."""
        delta = obj.requested_return_date - obj.current_return_date
        return delta.days


class AssetDocumentSerializer(serializers.ModelSerializer):
    asset_id = serializers.CharField(source='asset.asset_id', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    
    class Meta:
        model = AssetDocument
        fields = '__all__'


class BudgetSerializer(serializers.ModelSerializer):
    campus_name = serializers.CharField(source='campus.name', read_only=True)
    remaining_amount = serializers.SerializerMethodField()
    utilization_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = Budget
        fields = '__all__'
    
    def get_remaining_amount(self, obj):
        return obj.remaining_amount()
    
    def get_utilization_percentage(self, obj):
        return obj.utilization_percentage()


class BudgetTransactionSerializer(serializers.ModelSerializer):
    budget_name = serializers.CharField(source='budget.name', read_only=True)
    asset_id = serializers.CharField(source='asset.asset_id', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    
    class Meta:
        model = BudgetTransaction
        fields = '__all__'



class AssetEventSerializer(serializers.ModelSerializer):
    asset_id = serializers.CharField(source='asset.asset_id', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    actor_name = serializers.SerializerMethodField()
    related_object_details = serializers.SerializerMethodField()
    
    class Meta:
        model = AssetEvent
        fields = [
            'id', 'asset', 'asset_id', 'asset_name', 'event_type', 'event_type_display',
            'event_date', 'event_data', 'actor', 'actor_name', 'description',
            'related_checkout', 'related_maintenance', 'related_transfer',
            'related_object_details', 'created_at'
        ]
        read_only_fields = fields
    
    def get_actor_name(self, obj):
        return obj.actor.get_full_name() if obj.actor else 'System'
    
    def get_related_object_details(self, obj):
        """Get details of related objects based on event type."""
        details = {}
        
        if obj.related_checkout:
            details['checkout'] = {
                'id': obj.related_checkout.id,
                'checked_out_to': obj.related_checkout.checked_out_to.get_full_name() if obj.related_checkout.checked_out_to else None,
                'checkout_date': obj.related_checkout.checkout_date.isoformat() if obj.related_checkout.checkout_date else None,
                'expected_return_date': obj.related_checkout.expected_return_date.isoformat() if obj.related_checkout.expected_return_date else None,
                'actual_return_date': obj.related_checkout.actual_return_date.isoformat() if obj.related_checkout.actual_return_date else None,
            }
        
        if obj.related_maintenance:
            details['maintenance'] = {
                'id': obj.related_maintenance.id,
                'request_id': obj.related_maintenance.request_id,
                'category': obj.related_maintenance.get_category_display(),
                'priority': obj.related_maintenance.get_priority_display(),
                'status': obj.related_maintenance.get_status_display(),
                'assigned_to': obj.related_maintenance.assigned_to.get_full_name() if obj.related_maintenance.assigned_to else None,
            }
        
        if obj.related_transfer:
            details['transfer'] = {
                'id': obj.related_transfer.id,
                'from_room': str(obj.related_transfer.from_room) if obj.related_transfer.from_room else None,
                'to_room': str(obj.related_transfer.to_room) if obj.related_transfer.to_room else None,
                'transfer_date': obj.related_transfer.transfer_date.isoformat() if obj.related_transfer.transfer_date else None,
            }
        
        return details



class AssetDisposalSerializer(serializers.ModelSerializer):
    """Serializer for Asset Disposal (BR-AM-03)."""
    asset_id = serializers.CharField(source='asset.asset_id', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    property_manager_name = serializers.CharField(source='property_manager.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    disposal_method_display = serializers.CharField(source='get_disposal_method_display', read_only=True)
    disposal_category_display = serializers.CharField(source='get_disposal_category_display', read_only=True)
    
    class Meta:
        from .models import AssetDisposal
        model = AssetDisposal
        fields = '__all__'
        read_only_fields = ['requested_by', 'request_date', 
                           'manager_approval_date', 'status']


class AssetVerificationSerializer(serializers.ModelSerializer):
    """Serializer for Asset Verification (BR-AM-04)."""
    asset_id = serializers.CharField(source='asset.asset_id', read_only=True)
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.get_full_name', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.get_full_name', read_only=True)
    actual_location_info = serializers.CharField(source='actual_location.__str__', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    days_until_deadline = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        from .models import AssetVerification
        model = AssetVerification
        fields = '__all__'
        read_only_fields = ['discrepancy_reported_date', 'discrepancy_report_deadline',
                           'resolved_date']
    
    def get_days_until_deadline(self, obj):
        return obj.days_until_report_deadline()
    
    def get_is_overdue(self, obj):
        return obj.is_discrepancy_report_overdue()


class AssetTransferApprovalSerializer(serializers.Serializer):
    """Serializer for transfer approval actions (BR-AM-02)."""
    approval_type = serializers.ChoiceField(choices=['source', 'dest', 'reject'])
    notes = serializers.CharField(required=False, allow_blank=True)
    rejection_reason = serializers.CharField(required=False, allow_blank=True)


class AssetBusinessRuleCheckSerializer(serializers.Serializer):
    """Serializer for business rule check responses."""
    rule = serializers.CharField()
    status = serializers.CharField()
    message = serializers.CharField()
    details = serializers.DictField(required=False)
