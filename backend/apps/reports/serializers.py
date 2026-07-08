"""
Serializers for Reporting & Compliance (BR-RC-01 through BR-RC-04)
"""

from rest_framework import serializers
from .models import ScheduledReport, GeneratedReport, ReportDistribution, MaintenanceMetrics
from apps.users.models import User


class ScheduledReportSerializer(serializers.ModelSerializer):
    """Serializer for scheduled reports (BR-RC-01)."""
    recipients_details = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = ScheduledReport
        fields = [
            'id', 'name', 'report_type', 'frequency', 'recipients', 'recipients_details',
            'recipient_emails', 'day_of_month', 'day_of_week', 'time_of_day',
            'status', 'last_run', 'next_run', 'parameters', 'is_compliance_required',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['last_run', 'next_run', 'created_at', 'updated_at']
    
    def get_recipients_details(self, obj):
        """Get recipient user details."""
        return [
            {
                'id': user.id,
                'name': user.get_full_name(),
                'email': user.email,
                'role': user.role
            }
            for user in obj.recipients.all()
        ]
    
    def create(self, validated_data):
        """Create scheduled report and calculate next run."""
        report = super().create(validated_data)
        report.next_run = report.calculate_next_run()
        report.save()
        return report


class GeneratedReportSerializer(serializers.ModelSerializer):
    """Serializer for generated reports (BR-RC-04)."""
    generated_by_name = serializers.CharField(source='generated_by.get_full_name', read_only=True)
    authorized_by_name = serializers.CharField(source='authorized_by.get_full_name', read_only=True)
    scheduled_report_name = serializers.CharField(source='scheduled_report.name', read_only=True)
    header_metadata = serializers.SerializerMethodField()
    sent_to_details = serializers.SerializerMethodField()
    
    class Meta:
        model = GeneratedReport
        fields = [
            'id', 'scheduled_report', 'scheduled_report_name', 'report_type', 'title',
            'generated_at', 'generated_by', 'generated_by_name', 'period_start', 'period_end',
            'data', 'metrics', 'data_currency_disclaimer', 'authorized_by', 'authorized_by_name',
            'follows_ethiopian_guidelines', 'guideline_reference', 'file', 'file_format',
            'sent_to', 'sent_to_details', 'sent_at', 'is_draft', 'is_archived',
            'header_metadata', 'created_at', 'updated_at'
        ]
        read_only_fields = ['generated_at', 'created_at', 'updated_at']
    
    def get_header_metadata(self, obj):
        """Get BR-RC-04 compliant header metadata."""
        return obj.get_header_metadata()
    
    def get_sent_to_details(self, obj):
        """Get recipient details."""
        return [
            {
                'id': user.id,
                'name': user.get_full_name(),
                'email': user.email,
                'role': user.role
            }
            for user in obj.sent_to.all()
        ]


class ReportDistributionSerializer(serializers.ModelSerializer):
    """Serializer for report distribution tracking."""
    recipient_name = serializers.CharField(source='recipient.get_full_name', read_only=True)
    report_title = serializers.CharField(source='report.title', read_only=True)
    
    class Meta:
        model = ReportDistribution
        fields = [
            'id', 'report', 'report_title', 'recipient', 'recipient_name',
            'recipient_email', 'sent_at', 'delivery_status', 'opened_at',
            'downloaded_at', 'created_at'
        ]
        read_only_fields = ['sent_at', 'created_at']


class MaintenanceMetricsSerializer(serializers.ModelSerializer):
    """Serializer for maintenance metrics (BR-RC-03)."""
    calculated_by_name = serializers.CharField(source='calculated_by.get_full_name', read_only=True)
    
    class Meta:
        model = MaintenanceMetrics
        fields = [
            'id', 'period_start', 'period_end', 'mean_time_to_repair',
            'first_time_fix_rate', 'cost_per_repair', 'total_requests',
            'completed_requests', 'overdue_requests', 'total_cost',
            'metrics_by_category', 'metrics_by_priority', 'calculated_at',
            'calculated_by', 'calculated_by_name', 'created_at'
        ]
        read_only_fields = ['calculated_at', 'created_at']


class ReportGenerationRequestSerializer(serializers.Serializer):
    """Serializer for report generation requests."""
    report_type = serializers.ChoiceField(choices=ScheduledReport.REPORT_TYPE_CHOICES)
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    title = serializers.CharField(max_length=200, required=False)
    parameters = serializers.JSONField(required=False, default=dict)
    file_format = serializers.ChoiceField(
        choices=['PDF', 'EXCEL', 'CSV', 'JSON'],
        default='PDF'
    )
    send_to_recipients = serializers.BooleanField(default=False)
    recipient_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list
    )
    
    def validate(self, data):
        """Validate date range."""
        if data['period_start'] > data['period_end']:
            raise serializers.ValidationError(
                "period_start must be before period_end"
            )
        return data
