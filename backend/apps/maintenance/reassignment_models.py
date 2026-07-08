from django.db import models
from django.conf import settings
from django.utils import timezone


class RequestReassignment(models.Model):
    """Track maintenance request reassignments."""
    REASON_CHOICES = [
        ('WORKLOAD', 'Workload Balancing'),
        ('SPECIALIZATION', 'Specialization Mismatch'),
        ('UNAVAILABLE', 'Technician Unavailable'),
        ('PERFORMANCE', 'Performance Issues'),
        ('EMERGENCY', 'Emergency Reassignment'),
        ('OTHER', 'Other'),
    ]
    
    request = models.ForeignKey(
        'maintenance.MaintenanceRequest',
        on_delete=models.CASCADE,
        related_name='reassignments'
    )
    from_technician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='reassignments_from'
    )
    to_technician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='reassignments_to'
    )
    reassigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='reassignments_made'
    )
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    notes = models.TextField(blank=True)
    reassigned_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-reassigned_at']
        indexes = [
            models.Index(fields=['request']),
            models.Index(fields=['from_technician']),
            models.Index(fields=['to_technician']),
            models.Index(fields=['reassigned_at']),
        ]
    
    def __str__(self):
        return f"{self.request.request_id}: {self.from_technician} → {self.to_technician}"


class SLATracking(models.Model):
    """Track SLA compliance for maintenance requests."""
    request = models.OneToOneField(
        'maintenance.MaintenanceRequest',
        on_delete=models.CASCADE,
        related_name='sla_tracking'
    )
    
    # Response SLA
    response_sla_hours = models.IntegerField(help_text="Expected response time in hours")
    response_deadline = models.DateTimeField()
    response_time = models.DateTimeField(null=True, blank=True)
    response_met = models.BooleanField(default=False)
    response_delay_hours = models.FloatField(default=0)
    
    # Resolution SLA
    resolution_sla_hours = models.IntegerField(help_text="Expected resolution time in hours")
    resolution_deadline = models.DateTimeField()
    resolution_time = models.DateTimeField(null=True, blank=True)
    resolution_met = models.BooleanField(default=False)
    resolution_delay_hours = models.FloatField(default=0)
    
    # Escalation tracking
    escalated = models.BooleanField(default=False)
    escalation_reason = models.TextField(blank=True)
    escalated_at = models.DateTimeField(null=True, blank=True)
    escalated_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='escalated_requests'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['response_met', 'resolution_met']),
            models.Index(fields=['response_deadline']),
            models.Index(fields=['resolution_deadline']),
        ]
        verbose_name = 'SLA Tracking'
        verbose_name_plural = 'SLA Tracking'
    
    def __str__(self):
        return f"SLA for {self.request.request_id}"
    
    def check_response_sla(self):
        """Check if response SLA is met."""
        if self.response_time:
            self.response_met = self.response_time <= self.response_deadline
            if not self.response_met:
                delay = (self.response_time - self.response_deadline).total_seconds() / 3600
                self.response_delay_hours = delay
            self.save()
    
    def check_resolution_sla(self):
        """Check if resolution SLA is met."""
        if self.resolution_time:
            self.resolution_met = self.resolution_time <= self.resolution_deadline
            if not self.resolution_met:
                delay = (self.resolution_time - self.resolution_deadline).total_seconds() / 3600
                self.resolution_delay_hours = delay
            self.save()
    
    def is_overdue(self):
        """Check if request is currently overdue."""
        now = timezone.now()
        if not self.response_time and now > self.response_deadline:
            return True
        if not self.resolution_time and now > self.resolution_deadline:
            return True
        return False
    
    def get_status(self):
        """Get current SLA status."""
        if self.resolution_time:
            return 'COMPLETED'
        elif self.is_overdue():
            return 'OVERDUE'
        elif self.escalated:
            return 'ESCALATED'
        else:
            return 'ON_TRACK'
