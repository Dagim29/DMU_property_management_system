"""Feedback and rating models."""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from .models import TimeStampedModel


class ServiceRating(TimeStampedModel):
    """Rating for completed maintenance service."""
    maintenance_request = models.OneToOneField(
        'maintenance.MaintenanceRequest',
        on_delete=models.CASCADE,
        related_name='service_rating'
    )
    rated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='service_ratings'
    )
    
    # Overall rating
    overall_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    
    # Aspect ratings
    timeliness_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    quality_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    communication_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    
    # Feedback
    feedback_text = models.TextField(blank=True)
    is_anonymous = models.BooleanField(default=False)
    
    # Response from management
    response_text = models.TextField(blank=True)
    responded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='rating_responses'
    )
    responded_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['maintenance_request']),
            models.Index(fields=['rated_by']),
            models.Index(fields=['overall_rating']),
        ]
    
    def __str__(self):
        return f"Rating for {self.maintenance_request.request_id} - {self.overall_rating}★"


class AssetFeedback(TimeStampedModel):
    """Feedback on asset condition and usability."""
    FEEDBACK_TYPES = [
        ('CONDITION', 'Condition Issue'),
        ('REPLACEMENT', 'Replacement Suggestion'),
        ('MISSING_FEATURE', 'Missing Feature/Accessory'),
        ('GENERAL', 'General Feedback'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('REVIEWED', 'Reviewed'),
        ('RESOLVED', 'Resolved'),
        ('REJECTED', 'Rejected'),
    ]
    
    asset = models.ForeignKey(
        'assets.Asset',
        on_delete=models.CASCADE,
        related_name='feedback'
    )
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='asset_feedback'
    )
    feedback_type = models.CharField(max_length=20, choices=FEEDBACK_TYPES)
    description = models.TextField()
    photos = models.JSONField(default=list)  # List of photo URLs
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )
    
    response_text = models.TextField(blank=True)
    responded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='feedback_responses'
    )
    responded_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['asset']),
            models.Index(fields=['submitted_by']),
            models.Index(fields=['status']),
            models.Index(fields=['feedback_type']),
        ]
    
    def __str__(self):
        return f"{self.get_feedback_type_display()} - {self.asset.asset_id}"


class PortalSuggestion(TimeStampedModel):
    """Suggestions for portal improvements."""
    CATEGORIES = [
        ('UI', 'User Interface'),
        ('FEATURES', 'Features'),
        ('PERFORMANCE', 'Performance'),
        ('MOBILE', 'Mobile Experience'),
        ('OTHER', 'Other'),
    ]
    
    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
    ]
    
    STATUS_CHOICES = [
        ('SUBMITTED', 'Submitted'),
        ('UNDER_REVIEW', 'Under Review'),
        ('PLANNED', 'Planned'),
        ('IMPLEMENTED', 'Implemented'),
        ('REJECTED', 'Rejected'),
    ]
    
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='portal_suggestions'
    )
    category = models.CharField(max_length=20, choices=CATEGORIES)
    title = models.CharField(max_length=200)
    description = models.TextField()
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='MEDIUM'
    )
    
    screenshots = models.JSONField(default=list)
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='SUBMITTED'
    )
    
    votes = models.IntegerField(default=0)
    voters = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='voted_suggestions',
        blank=True
    )
    
    class Meta:
        ordering = ['-votes', '-created_at']
        indexes = [
            models.Index(fields=['submitted_by']),
            models.Index(fields=['status']),
            models.Index(fields=['category']),
            models.Index(fields=['-votes']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.votes} votes)"
