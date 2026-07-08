from rest_framework import serializers
from .models import MaintenanceRequest, WorkOrder, PreventiveMaintenance


class ServiceRatingNestedSerializer(serializers.Serializer):
    """Nested serializer for service rating on maintenance request."""
    id = serializers.IntegerField(read_only=True)
    overall_rating = serializers.IntegerField(read_only=True)
    timeliness_rating = serializers.IntegerField(read_only=True)
    quality_rating = serializers.IntegerField(read_only=True)
    communication_rating = serializers.IntegerField(read_only=True)
    feedback_text = serializers.CharField(read_only=True)
    is_anonymous = serializers.BooleanField(read_only=True)
    rated_by_name = serializers.SerializerMethodField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)

    def get_rated_by_name(self, obj):
        if obj.is_anonymous:
            return 'Anonymous'
        return obj.rated_by.get_full_name() if obj.rated_by else ''


class WorkOrderSignOffSerializer(serializers.Serializer):
    """Nested sign-off info from the work order."""
    supervisor_signed_off = serializers.BooleanField(read_only=True)
    supervisor_signoff_by_name = serializers.SerializerMethodField(read_only=True)
    supervisor_signoff_date = serializers.DateTimeField(read_only=True)
    requester_signed_off = serializers.BooleanField(read_only=True)
    requester_signoff_by_name = serializers.SerializerMethodField(read_only=True)
    requester_signoff_date = serializers.DateTimeField(read_only=True)
    fully_approved = serializers.BooleanField(read_only=True)
    cost_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    def get_supervisor_signoff_by_name(self, obj):
        return obj.supervisor_signoff_by.get_full_name() if obj.supervisor_signoff_by else ''

    def get_requester_signoff_by_name(self, obj):
        return obj.requester_signoff_by.get_full_name() if obj.requester_signoff_by else ''


class MaintenanceRequestSerializer(serializers.ModelSerializer):
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    asset_id_display = serializers.CharField(source='asset.asset_id', read_only=True)
    asset_location = serializers.SerializerMethodField()
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    is_overdue = serializers.SerializerMethodField()
    sla_deadline = serializers.SerializerMethodField()
    service_rating = ServiceRatingNestedSerializer(read_only=True)
    work_order_signoff = serializers.SerializerMethodField(read_only=True)
    
    # Read: nested asset object; Write: FK integer
    asset_detail = serializers.SerializerMethodField(read_only=True)
    requested_by_detail = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = MaintenanceRequest
        fields = [
            'id', 'request_id',
            'asset',
            'asset_detail',
            'asset_name', 'asset_id_display', 'asset_location',
            'requested_by', 'requested_by_detail', 'requested_by_name',
            'assigned_to', 'assigned_to_name',
            'category', 'priority', 'status', 'description', 'photo',
            'escalated', 'escalation_date', 'sla_deadline',
            'created_at', 'updated_at',
            'is_overdue', 'service_rating', 'work_order_signoff'
        ]
        read_only_fields = ['request_id', 'escalated', 'escalation_date']

    def get_sla_deadline(self, obj):
        try:
            return obj.get_sla_deadline().isoformat()
        except Exception:
            return None

    def get_work_order_signoff(self, obj):
        try:
            wo = obj.work_order
            return WorkOrderSignOffSerializer(wo).data
        except Exception:
            return None
    
    def get_is_overdue(self, obj):
        return obj.is_overdue()
    
    def get_asset_location(self, obj):
        if obj.asset:
            location = ''
            if obj.asset.campus:
                location = obj.asset.campus.name
            if obj.asset.room:
                location += f" - {obj.asset.room.name}"
            return location or 'N/A'
        return 'N/A'
    
    def get_asset_detail(self, obj):
        if obj.asset:
            location = ''
            if obj.asset.campus:
                location = obj.asset.campus.name
            if obj.asset.room:
                location += f" - {obj.asset.room.name}"
            return {
                'id': obj.asset.id,
                'asset_id': obj.asset.asset_id,
                'name': obj.asset.name,
                'location': location or 'N/A',
            }
        return None
    
    def get_requested_by_detail(self, obj):
        if obj.requested_by:
            return {
                'id': obj.requested_by.id,
                'first_name': obj.requested_by.first_name,
                'last_name': obj.requested_by.last_name,
                'email': obj.requested_by.email,
            }
        return None


class WorkOrderSerializer(serializers.ModelSerializer):
    request_id = serializers.CharField(source='request.request_id', read_only=True)
    asset_id = serializers.CharField(source='request.asset.asset_id', read_only=True)
    asset_name = serializers.CharField(source='request.asset.name', read_only=True)
    asset_location = serializers.CharField(source='request.asset.location', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    maintenance_request = MaintenanceRequestSerializer(source='request', read_only=True)
    
    class Meta:
        model = WorkOrder
        fields = '__all__'
        read_only_fields = ['cost_total']


class PreventiveMaintenanceSerializer(serializers.ModelSerializer):
    asset_name = serializers.CharField(source='asset.name', read_only=True)
    asset_id = serializers.CharField(source='asset.asset_id', read_only=True)
    
    class Meta:
        model = PreventiveMaintenance
        fields = '__all__'
