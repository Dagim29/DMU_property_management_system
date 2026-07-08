"""
Asset Assignment Request Models
Handles user requests for asset assignments with approval workflow and waitlist management.
"""
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.core.models import TimeStampedModel
from .models import Asset


class AssetAssignmentRequest(TimeStampedModel):
    """
    User requests for asset assignments with Property Manager approval workflow.
    Supports temporary and permanent assignments with waitlist management.
    """
    
    STATUS_CHOICES = [
        ('PENDING_REVIEW', 'Pending Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('WAITLISTED', 'Waitlisted'),
        ('ACTIVE', 'Active Assignment'),
        ('RETURNED', 'Returned'),
        ('CANCELLED', 'Cancelled'),
        ('EXPIRED', 'Expired'),
    ]
    
    ASSIGNMENT_TYPE_CHOICES = [
        ('TEMPORARY', 'Temporary Assignment'),
        ('PERMANENT', 'Permanent Assignment'),
        ('PROJECT_BASED', 'Project-Based Assignment'),
    ]
    
    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent'),
    ]
    
    CONDITION_CHOICES = [
        ('EXCELLENT', 'Excellent'),
        ('GOOD', 'Good'),
        ('FAIR', 'Fair'),
        ('POOR', 'Poor'),
        ('DAMAGED', 'Damaged'),
    ]
    
    # Request Identification
    request_id = models.CharField(max_length=50, unique=True, editable=False)
    
    # Core Request Information
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='assignment_requests')
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, 
                                     related_name='asset_assignment_requests')
    request_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING_REVIEW')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM')
    
    # Request Details
    purpose = models.TextField(help_text="Why do you need this asset?")
    assignment_type = models.CharField(max_length=20, choices=ASSIGNMENT_TYPE_CHOICES, default='TEMPORARY')
    requested_start_date = models.DateField()
    requested_end_date = models.DateField(null=True, blank=True, 
                                         help_text="Required for temporary assignments")
    department = models.CharField(max_length=100, blank=True)
    project_name = models.CharField(max_length=200, blank=True)
    
    # Manager Review
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   null=True, blank=True, related_name='reviewed_assignment_requests')
    review_date = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    
    # Waitlist Management
    waitlist_position = models.PositiveIntegerField(null=True, blank=True)
    waitlist_added_date = models.DateTimeField(null=True, blank=True)
    estimated_available_date = models.DateField(null=True, blank=True)
    notify_when_available = models.BooleanField(default=True)
    waitlist_notified = models.BooleanField(default=False)
    waitlist_notification_date = models.DateTimeField(null=True, blank=True)
    waitlist_response_deadline = models.DateTimeField(null=True, blank=True)
    
    # Assignment Details (when approved and active)
    assignment_start_date = models.DateTimeField(null=True, blank=True)
    assignment_end_date = models.DateField(null=True, blank=True)
    actual_return_date = models.DateTimeField(null=True, blank=True)
    
    # Asset Condition Documentation
    assignment_condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, blank=True,
                                           help_text="Asset condition at handover")
    return_condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, blank=True,
                                       help_text="Asset condition at return")
    assignment_condition_notes = models.TextField(blank=True)
    return_condition_notes = models.TextField(blank=True)
    
    # Photo Documentation
    handover_photos = models.JSONField(default=list, blank=True,
                                      help_text="URLs to handover photos")
    return_photos = models.JSONField(default=list, blank=True,
                                    help_text="URLs to return photos")
    
    # Compliance & Terms
    terms_accepted = models.BooleanField(default=False)
    terms_accepted_date = models.DateTimeField(null=True, blank=True)
    user_signature = models.TextField(blank=True, help_text="Digital signature/confirmation")
    training_required = models.BooleanField(default=False)
    training_completed = models.BooleanField(default=False)
    training_completed_date = models.DateTimeField(null=True, blank=True)
    
    # Notifications Tracking
    user_notified = models.BooleanField(default=False)
    manager_notified = models.BooleanField(default=False)
    reminder_sent_count = models.PositiveIntegerField(default=0)
    last_reminder_date = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    is_overdue = models.BooleanField(default=False)
    overdue_days = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['-request_date']
        indexes = [
            models.Index(fields=['request_id']),
            models.Index(fields=['status']),
            models.Index(fields=['requested_by', 'status']),
            models.Index(fields=['asset', 'status']),
            models.Index(fields=['priority', 'request_date']),
            models.Index(fields=['waitlist_position']),
            models.Index(fields=['is_overdue']),
        ]
    
    def __str__(self):
        return f"{self.request_id} - {self.asset.asset_id} by {self.requested_by.username}"
    
    def save(self, *args, **kwargs):
        # Generate request ID
        if not self.request_id:
            from django.db.models import Max
            last_request = AssetAssignmentRequest.objects.aggregate(Max('id'))
            next_id = (last_request['id__max'] or 0) + 1
            self.request_id = f"AAR-{next_id:06d}"
        
        # Validate temporary assignments have end date
        if self.assignment_type == 'TEMPORARY' and not self.requested_end_date:
            from django.core.exceptions import ValidationError
            raise ValidationError("Temporary assignments must have an end date")
        
        super().save(*args, **kwargs)
    
    @property
    def can_cancel(self):
        """Check if request can be cancelled by user."""
        return self.status in ['PENDING_REVIEW', 'WAITLISTED', 'APPROVED']
    
    @property
    def can_approve(self):
        """Check if request can be approved."""
        return self.status == 'PENDING_REVIEW'
    
    @property
    def can_reject(self):
        """Check if request can be rejected."""
        return self.status in ['PENDING_REVIEW', 'WAITLISTED']
    
    @property
    def can_activate(self):
        """Check if request can be activated (handover completed)."""
        return self.status == 'APPROVED' and self.terms_accepted
    
    @property
    def can_return(self):
        """Check if asset can be returned."""
        return self.status == 'ACTIVE'
    
    @property
    def is_temporary(self):
        """Check if this is a temporary assignment."""
        return self.assignment_type == 'TEMPORARY'
    
    def days_until_due(self):
        """Calculate days until assignment is due."""
        if not self.assignment_end_date or self.status != 'ACTIVE':
            return None
        from datetime import date
        
        # Handle both date objects and string dates
        end_date = self.assignment_end_date
        if isinstance(end_date, str):
            from django.utils.dateparse import parse_date
            end_date = parse_date(end_date)
        
        if not end_date:
            return None
            
        delta = end_date - date.today()
        return delta.days
    
    def calculate_overdue_days(self):
        """Calculate how many days overdue."""
        if not self.assignment_end_date or self.status != 'ACTIVE':
            return 0
        from datetime import date
        
        # Handle both date objects and string dates
        end_date = self.assignment_end_date
        if isinstance(end_date, str):
            from django.utils.dateparse import parse_date
            end_date = parse_date(end_date)
        
        if not end_date:
            return 0
            
        if date.today() > end_date:
            delta = date.today() - end_date
            return delta.days
        return 0
    
    def update_overdue_status(self):
        """Update overdue status and days."""
        overdue_days = self.calculate_overdue_days()
        self.overdue_days = overdue_days
        self.is_overdue = overdue_days > 0
        self.save(update_fields=['overdue_days', 'is_overdue'])


class AssetWaitlist(TimeStampedModel):
    """
    Manages waiting queue for unavailable assets.
    Automatically notifies users when assets become available.
    """
    
    STATUS_CHOICES = [
        ('WAITING', 'Waiting in Queue'),
        ('NOTIFIED', 'User Notified'),
        ('EXPIRED', 'Expired - No Response'),
        ('FULFILLED', 'Request Fulfilled'),
        ('CANCELLED', 'Cancelled by User'),
    ]
    
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='waitlist_entries')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                            related_name='waitlist_entries')
    request = models.OneToOneField(AssetAssignmentRequest, on_delete=models.CASCADE,
                                   related_name='waitlist_entry')
    
    position = models.PositiveIntegerField(help_text="Position in queue (1 = next)")
    added_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='WAITING')
    
    # Notification Management
    notification_sent = models.BooleanField(default=False)
    notification_date = models.DateTimeField(null=True, blank=True)
    response_deadline = models.DateTimeField(null=True, blank=True,
                                            help_text="User must respond by this time")
    
    # Expiration
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['asset', 'position']
        unique_together = ['asset', 'position']
        indexes = [
            models.Index(fields=['asset', 'status', 'position']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'response_deadline']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.asset.asset_id} (Position {self.position})"
    
    def notify_user(self):
        """Send notification to user that asset is available."""
        from django.utils import timezone
        from datetime import timedelta
        
        self.notification_sent = True
        self.notification_date = timezone.now()
        self.response_deadline = timezone.now() + timedelta(hours=24)
        self.status = 'NOTIFIED'
        self.save()
        
        # Update the related request
        self.request.waitlist_notified = True
        self.request.waitlist_notification_date = self.notification_date
        self.request.waitlist_response_deadline = self.response_deadline
        self.request.save()
        
        # Send notification (will be implemented in views)
        return True
    
    def mark_fulfilled(self):
        """Mark waitlist entry as fulfilled."""
        self.status = 'FULFILLED'
        self.save()
    
    def mark_expired(self):
        """Mark waitlist entry as expired due to no response."""
        self.status = 'EXPIRED'
        self.save()
        
        # Update request status
        self.request.status = 'EXPIRED'
        self.request.save()
    
    def cancel(self):
        """Cancel waitlist entry."""
        self.status = 'CANCELLED'
        self.save()


class AssignmentRequestHistory(TimeStampedModel):
    """
    Audit trail for assignment request status changes.
    Immutable record of all actions taken on a request.
    """
    
    ACTION_CHOICES = [
        ('CREATED', 'Request Created'),
        ('REVIEWED', 'Request Reviewed'),
        ('APPROVED', 'Request Approved'),
        ('REJECTED', 'Request Rejected'),
        ('WAITLISTED', 'Added to Waitlist'),
        ('NOTIFIED', 'User Notified'),
        ('TERMS_ACCEPTED', 'Terms Accepted'),
        ('ACTIVATED', 'Assignment Activated'),
        ('RETURNED', 'Asset Returned'),
        ('CANCELLED', 'Request Cancelled'),
        ('EXPIRED', 'Request Expired'),
        ('OVERDUE', 'Assignment Overdue'),
        ('REMINDER_SENT', 'Reminder Sent'),
    ]
    
    request = models.ForeignKey(AssetAssignmentRequest, on_delete=models.CASCADE,
                               related_name='history')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    action_date = models.DateTimeField(auto_now_add=True)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                    null=True, blank=True)
    
    old_status = models.CharField(max_length=20, blank=True)
    new_status = models.CharField(max_length=20, blank=True)
    
    notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True,
                               help_text="Additional action metadata")
    
    class Meta:
        ordering = ['-action_date']
        indexes = [
            models.Index(fields=['request', 'action_date']),
            models.Index(fields=['action']),
        ]
        verbose_name_plural = "Assignment Request Histories"
    
    def __str__(self):
        return f"{self.request.request_id} - {self.get_action_display()} at {self.action_date}"
