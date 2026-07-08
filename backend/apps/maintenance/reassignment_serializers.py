from rest_framework import serializers
from .models import RequestReassignment, SLATracking, MaintenanceRequest


class RequestReassignmentSerializer(serializers.ModelSerializer):
    from_technician_name = serializers.CharField(source='from_technician.get_full_name', read_only=True)
    to_technician_name = serializers.CharField(source='to_technician.get_full_name', read_only=True)
    reassigned_by_name = serializers.CharField(source='reassigned_by.get_full_name', read_only=True)
    request_id = serializers.CharField(source='request.request_id', read_only=True)
    
    class Meta:
        model = RequestReassignment
        fields = [
            'id', 'request', 'request_id', 'from_technician', 'from_technician_name',
            'to_technician', 'to_technician_name', 'reassigned_by', 'reassigned_by_name',
            'reason', 'notes', 'reassigned_at'
        ]
        read_only_fields = ['reassigned_by', 'reassigned_at']


class SLATrackingSerializer(serializers.ModelSerializer):
    request_id = serializers.CharField(source='request.request_id', read_only=True)
    request_priority = serializers.CharField(source='request.priority', read_only=True)
    request_status = serializers.CharField(source='request.status', read_only=True)
    escalated_to_name = serializers.CharField(source='escalated_to.get_full_name', read_only=True)
    sla_status = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = SLATracking
        fields = [
            'id', 'request', 'request_id', 'request_priority', 'request_status',
            'response_sla_hours', 'response_deadline', 'response_time', 'response_met',
            'response_delay_hours', 'resolution_sla_hours', 'resolution_deadline',
            'resolution_time', 'resolution_met', 'resolution_delay_hours',
            'escalated', 'escalation_reason', 'escalated_at', 'escalated_to',
            'escalated_to_name', 'sla_status', 'is_overdue', 'created_at', 'updated_at'
        ]
    
    def get_sla_status(self, obj):
        return obj.get_status()
    
    def get_is_overdue(self, obj):
        return obj.is_overdue()


class SLADashboardSerializer(serializers.Serializer):
    """Serializer for SLA dashboard statistics."""
    total_requests = serializers.IntegerField()
    on_track = serializers.IntegerField()
    overdue = serializers.IntegerField()
    escalated = serializers.IntegerField()
    completed = serializers.IntegerField()
    response_sla_met = serializers.IntegerField()
    resolution_sla_met = serializers.IntegerField()
    avg_response_time = serializers.FloatField()
    avg_resolution_time = serializers.FloatField()
    compliance_rate = serializers.FloatField()
