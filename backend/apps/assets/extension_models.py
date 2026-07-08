"""
Assignment Extension Request Models
Allows users to request extensions for their active assignments.
"""
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.core.models import TimeStampedModel
from .assignment_models import AssetAssignmentRequest


class AssignmentExtensionRequest(TimeStampedModel):
    """
    User requests to extend their active assignment beyond original end date.
    Requires Property Manager approval.
    """
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    # Request Identification
    extension_id = models.CharField(max_length=50, unique=True, editable=False)
    
    # Core Information
    assignment = models.ForeignKey(
        AssetAssignmentRequest,
        on_delete=models.CASCADE,
        related_name='extension_requests'
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='extension_requests'
    )
    request_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    # Extension Details
    current_end_date = models.DateField(help_text="Current assignment end date")
    requested_new_end_date = models.DateField(help_text="Requested new end date")
    extension_days = models.PositiveIntegerField(help_text="Number of days requested")
    reason = models.TextField(help_text="Why extension is needed")
    
    # Review
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_extensions'
    )
    review_date = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    
    # Approved Extension
    approved_end_date = models.DateField(null=True, blank=True)
    approved_days = models.PositiveIntegerField(null=True, blank=True)
    
    class Meta:
        ordering = ['-request_date']
        indexes = [
            models.Index(fields=['extension_id']),
            models.Index(fields=['assignment', 'status']),
            models.Index(fields=['requested_by', 'status']),
            models.Index(fields=['status', 'request_date']),
        ]
    
    def __str__(self):
        return f"{self.extension_id} - {self.assignment.request_id}"
    
    def save(self, *args, **kwargs):
        # Generate extension ID
        if not self.extension_id:
            from django.db.models import Max
            last_ext = AssignmentExtensionRequest.objects.aggregate(Max('id'))
            next_id = (last_ext['id__max'] or 0) + 1
            self.extension_id = f"EXT-{next_id:06d}"
        
        # Calculate extension days
        if self.requested_new_end_date and self.current_end_date:
            delta = self.requested_new_end_date - self.current_end_date
            self.extension_days = delta.days
        
        super().save(*args, **kwargs)
    
    @property
    def can_approve(self):
        """Check if extension can be approved."""
        return self.status == 'PENDING'
    
    @property
    def can_reject(self):
        """Check if extension can be rejected."""
        return self.status == 'PENDING'
    
    @property
    def can_cancel(self):
        """Check if extension can be cancelled by user."""
        return self.status == 'PENDING'
