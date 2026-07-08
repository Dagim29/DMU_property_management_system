"""
Models for Reporting & Compliance (BR-RC-01 through BR-RC-04)
"""

from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel
from django.utils import timezone


class ScheduledReport(TimeStampedModel):
    """
    BR-RC-01: Scheduled reports (e.g., monthly asset reports by 5th)
    """
    REPORT_TYPE_CHOICES = [
        ('ASSET_STATUS', 'Asset Status Summary'),
        ('MAINTENANCE_COST', 'Maintenance Cost Analysis'),
        ('ASSET_UTILIZATION', 'Asset Utilization'),
        ('PREVENTIVE_COMPLIANCE', 'Preventive Maintenance Compliance'),
        ('MONTHLY_ASSET', 'Monthly Asset Report'),
        ('AUDIT_TRAIL', 'Audit Trail Report'),
    ]
    
    FREQUENCY_CHOICES = [
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('MONTHLY', 'Monthly'),
        ('QUARTERLY', 'Quarterly'),
        ('ANNUALLY', 'Annually'),
    ]
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('PAUSED', 'Paused'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]
    
    name = models.CharField(max_length=200)
    report_type = models.CharField(max_length=30, choices=REPORT_TYPE_CHOICES)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    
    # BR-RC-01: Recipients for monthly reports
    recipients = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='scheduled_reports',
        help_text="Property Manager, Finance Director, University Auditor"
    )
    recipient_emails = models.TextField(
        blank=True,
        help_text="Additional email addresses (comma-separated)"
    )
    
    # Scheduling
    day_of_month = models.IntegerField(
        null=True,
        blank=True,
        help_text="Day of month for monthly reports (e.g., 5 for BR-RC-01)"
    )
    day_of_week = models.IntegerField(
        null=True,
        blank=True,
        help_text="Day of week for weekly reports (0=Monday, 6=Sunday)"
    )
    time_of_day = models.TimeField(
        help_text="Time to generate report"
    )
    
    # Status tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    last_run = models.DateTimeField(null=True, blank=True)
    next_run = models.DateTimeField(null=True, blank=True)
    
    # Report parameters
    parameters = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional parameters for report generation"
    )
    
    # Compliance
    is_compliance_required = models.BooleanField(
        default=False,
        help_text="BR-RC-02: Follows Ethiopian Federal Guidelines"
    )
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_scheduled_reports'
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'next_run']),
            models.Index(fields=['report_type']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.get_frequency_display()}"
    
    def calculate_next_run(self):
        """Calculate next run time based on frequency."""
        from datetime import datetime, timedelta
        
        now = timezone.now()
        
        if self.frequency == 'DAILY':
            next_run = now.replace(
                hour=self.time_of_day.hour,
                minute=self.time_of_day.minute,
                second=0,
                microsecond=0
            )
            if next_run <= now:
                next_run += timedelta(days=1)
        
        elif self.frequency == 'MONTHLY':
            # BR-RC-01: Monthly reports by 5th
            day = self.day_of_month or 5
            next_run = now.replace(
                day=day,
                hour=self.time_of_day.hour,
                minute=self.time_of_day.minute,
                second=0,
                microsecond=0
            )
            if next_run <= now:
                # Move to next month
                if now.month == 12:
                    next_run = next_run.replace(year=now.year + 1, month=1)
                else:
                    next_run = next_run.replace(month=now.month + 1)
        
        elif self.frequency == 'WEEKLY':
            # Calculate next occurrence of day_of_week
            days_ahead = (self.day_of_week or 0) - now.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            next_run = now + timedelta(days=days_ahead)
            next_run = next_run.replace(
                hour=self.time_of_day.hour,
                minute=self.time_of_day.minute,
                second=0,
                microsecond=0
            )
        
        else:
            next_run = now + timedelta(days=1)
        
        return next_run


class GeneratedReport(TimeStampedModel):
    """
    BR-RC-04: Generated reports with timestamp, disclaimer, authorization
    """
    scheduled_report = models.ForeignKey(
        ScheduledReport,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_reports'
    )
    
    report_type = models.CharField(max_length=30)
    title = models.CharField(max_length=200)
    
    # BR-RC-04: Required metadata
    generated_at = models.DateTimeField(auto_now_add=True)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='generated_reports'
    )
    
    # Report period
    period_start = models.DateField()
    period_end = models.DateField()
    
    # Report data
    data = models.JSONField(
        default=dict,
        help_text="Report data in JSON format"
    )
    
    # BR-RC-03: Maintenance metrics
    metrics = models.JSONField(
        default=dict,
        help_text="MTTR, First-Time Fix Rate, Cost Per Repair, etc."
    )
    
    # BR-RC-04: Compliance fields
    data_currency_disclaimer = models.TextField(
        default="Data is current as of report generation time. "
                "Asset and maintenance information may have changed since generation."
    )
    authorized_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='authorized_reports',
        help_text="BR-RC-04: Authorization line"
    )
    
    # BR-RC-02: Compliance with Ethiopian guidelines
    follows_ethiopian_guidelines = models.BooleanField(
        default=True,
        help_text="BR-RC-02: Follows Ethiopian Federal Property Administration Guidelines"
    )
    guideline_reference = models.CharField(
        max_length=100,
        blank=True,
        help_text="Reference to specific guideline (e.g., Annex B, Section 3.2)"
    )
    
    # File storage
    file = models.FileField(
        upload_to='reports/generated/',
        null=True,
        blank=True,
        help_text="Generated report file (PDF, Excel, etc.)"
    )
    file_format = models.CharField(
        max_length=10,
        choices=[
            ('PDF', 'PDF'),
            ('EXCEL', 'Excel'),
            ('CSV', 'CSV'),
            ('JSON', 'JSON'),
        ],
        default='PDF'
    )
    
    # Distribution tracking
    sent_to = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='received_reports',
        blank=True
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    
    # Status
    is_draft = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-generated_at']
        indexes = [
            models.Index(fields=['report_type', 'generated_at']),
            models.Index(fields=['period_start', 'period_end']),
            models.Index(fields=['is_draft', 'is_archived']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.generated_at.strftime('%Y-%m-%d')}"
    
    def get_header_metadata(self):
        """BR-RC-04: Get report header with required metadata."""
        return {
            'title': self.title,
            'generated_at': self.generated_at.isoformat(),
            'generated_by': self.generated_by.get_full_name() if self.generated_by else 'System',
            'period': f"{self.period_start} to {self.period_end}",
            'disclaimer': self.data_currency_disclaimer,
            'authorized_by': self.authorized_by.get_full_name() if self.authorized_by else 'Pending Authorization',
            'follows_guidelines': self.follows_ethiopian_guidelines,
            'guideline_reference': self.guideline_reference or 'N/A',
        }


class ReportDistribution(TimeStampedModel):
    """
    Track report distribution for BR-RC-01 compliance
    """
    report = models.ForeignKey(
        GeneratedReport,
        on_delete=models.CASCADE,
        related_name='distributions'
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='report_distributions'
    )
    recipient_email = models.EmailField()
    
    sent_at = models.DateTimeField(auto_now_add=True)
    delivery_status = models.CharField(
        max_length=20,
        choices=[
            ('SENT', 'Sent'),
            ('DELIVERED', 'Delivered'),
            ('FAILED', 'Failed'),
            ('BOUNCED', 'Bounced'),
        ],
        default='SENT'
    )
    
    opened_at = models.DateTimeField(null=True, blank=True)
    downloaded_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-sent_at']
        unique_together = ['report', 'recipient']
    
    def __str__(self):
        return f"{self.report.title} → {self.recipient.get_full_name()}"


class MaintenanceMetrics(TimeStampedModel):
    """
    BR-RC-03: Track maintenance performance metrics
    """
    # Time period
    period_start = models.DateField()
    period_end = models.DateField()
    
    # BR-RC-03: Required metrics
    mean_time_to_repair = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="MTTR in hours"
    )
    first_time_fix_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Percentage of issues fixed on first attempt"
    )
    cost_per_repair = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Average cost per repair in ETB"
    )
    
    # Additional metrics
    total_requests = models.IntegerField(default=0)
    completed_requests = models.IntegerField(default=0)
    overdue_requests = models.IntegerField(default=0)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Breakdown by category
    metrics_by_category = models.JSONField(
        default=dict,
        help_text="Metrics broken down by maintenance category"
    )
    
    # Breakdown by priority
    metrics_by_priority = models.JSONField(
        default=dict,
        help_text="Metrics broken down by priority level"
    )
    
    calculated_at = models.DateTimeField(auto_now_add=True)
    calculated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    
    class Meta:
        ordering = ['-period_end']
        unique_together = ['period_start', 'period_end']
        verbose_name_plural = "Maintenance Metrics"
    
    def __str__(self):
        return f"Metrics: {self.period_start} to {self.period_end}"
