"""
Performance Review Models
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.core.models import TimeStampedModel


class PerformanceReview(TimeStampedModel):
    """Performance review for technicians by supervisors"""
    
    technician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='performance_reviews',
        limit_choices_to={'role': 'MAINTENANCE_TECHNICIAN'}
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='reviews_given',
        limit_choices_to={'role__in': ['MAINTENANCE_SUPERVISOR', 'PROPERTY_MANAGER']}
    )
    
    # Review period
    review_period_start = models.DateField()
    review_period_end = models.DateField()
    
    # Rating categories (1-5 scale)
    quality_of_work = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Quality and accuracy of work performed"
    )
    timeliness = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Ability to complete tasks on time"
    )
    communication = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Communication with team and requesters"
    )
    professionalism = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Professional conduct and attitude"
    )
    technical_skills = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Technical expertise and problem-solving"
    )
    teamwork = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Collaboration and teamwork"
    )
    
    # Overall rating (auto-calculated)
    overall_rating = models.FloatField(editable=False)
    
    # Feedback
    strengths = models.TextField(blank=True, help_text="Key strengths and achievements")
    areas_for_improvement = models.TextField(blank=True, help_text="Areas needing improvement")
    comments = models.TextField(blank=True, help_text="Additional comments and feedback")
    goals = models.TextField(blank=True, help_text="Goals for next review period")
    
    # Metrics during review period
    work_orders_completed = models.IntegerField(default=0)
    avg_completion_time_hours = models.FloatField(default=0)
    sla_compliance_rate = models.FloatField(default=0, help_text="Percentage")
    customer_satisfaction_avg = models.FloatField(default=0, help_text="Average rating from service ratings")
    
    # Acknowledgment
    technician_acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    technician_comments = models.TextField(blank=True, help_text="Technician's response to review")
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['technician', '-created_at']),
            models.Index(fields=['reviewer']),
            models.Index(fields=['review_period_start', 'review_period_end']),
        ]
        unique_together = ['technician', 'review_period_start', 'review_period_end']
    
    def __str__(self):
        return f"Review for {self.technician.get_full_name()} - {self.review_period_start} to {self.review_period_end}"
    
    def save(self, *args, **kwargs):
        # Calculate overall rating as average of all categories
        self.overall_rating = (
            self.quality_of_work +
            self.timeliness +
            self.communication +
            self.professionalism +
            self.technical_skills +
            self.teamwork
        ) / 6.0
        super().save(*args, **kwargs)
    
    def acknowledge(self, comments=''):
        """Technician acknowledges the review"""
        from django.utils import timezone
        self.technician_acknowledged = True
        self.acknowledged_at = timezone.now()
        if comments:
            self.technician_comments = comments
        self.save()
    
    def get_rating_category(self):
        """Get rating category based on overall rating"""
        if self.overall_rating >= 4.5:
            return 'EXCELLENT'
        elif self.overall_rating >= 3.5:
            return 'GOOD'
        elif self.overall_rating >= 2.5:
            return 'SATISFACTORY'
        else:
            return 'NEEDS_IMPROVEMENT'


class ReviewTemplate(TimeStampedModel):
    """Templates for performance reviews"""
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Template content
    strengths_template = models.TextField(blank=True)
    improvement_template = models.TextField(blank=True)
    goals_template = models.TextField(blank=True)
    
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='review_templates_created'
    )
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name
