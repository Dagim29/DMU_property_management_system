from rest_framework import serializers
from .models import TechnicianAvailability, TechnicianShift, User


class TechnicianAvailabilitySerializer(serializers.ModelSerializer):
    technician_name = serializers.CharField(source='technician.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    is_active = serializers.SerializerMethodField()
    
    class Meta:
        model = TechnicianAvailability
        fields = [
            'id', 'technician', 'technician_name', 'status', 'start_date', 'end_date',
            'reason', 'notes', 'approved', 'approved_by', 'approved_by_name',
            'approved_at', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['approved', 'approved_by', 'approved_at']
    
    def get_is_active(self, obj):
        return obj.is_active()


class TechnicianShiftSerializer(serializers.ModelSerializer):
    technician_name = serializers.CharField(source='technician.get_full_name', read_only=True)
    
    class Meta:
        model = TechnicianShift
        fields = [
            'id', 'technician', 'technician_name', 'day_of_week', 'shift_type',
            'start_time', 'end_time', 'is_active', 'created_at', 'updated_at'
        ]


class TechnicianAvailabilityStatusSerializer(serializers.Serializer):
    """Serializer for checking technician availability status."""
    technician_id = serializers.IntegerField()
    technician_name = serializers.CharField()
    is_available = serializers.BooleanField()
    current_status = serializers.CharField()
    unavailable_until = serializers.DateField(allow_null=True)
    reason = serializers.CharField(allow_null=True)
