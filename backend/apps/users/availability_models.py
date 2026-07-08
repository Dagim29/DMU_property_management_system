from django.db import models
from django.conf import settings
from django.utils import timezone


class TechnicianAvailability(models.Model):
    """Track technician availability, schedules, and time off."""
    STATUS_CHOICES = [
        ('AVAILABLE', 'Available'),
        ('ON_LEAVE', 'On Leave'),
        ('SICK_LEAVE', 'Sick Leave'),
        ('VACATION', 'Vacation'),
        ('TRAINING', 'Training'),
        ('OFF_DUTY', 'Off Duty'),
    ]
    
    technician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='availability_records',
        limit_choices_to={'role': 'MAINTENANCE_TECHNICIAN'}
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    
    # Approval tracking
    approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_availability'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-start_date']
        indexes = [
            models.Index(fields=['technician', 'start_date', 'end_date']),
            models.Index(fields=['status']),
        ]
        verbose_name_plural = 'Technician Availabilities'
    
    def __str__(self):
        return f"{self.technician.get_full_name()} - {self.get_status_display()} ({self.start_date} to {self.end_date})"
    
    def is_active(self):
        """Check if this availability record is currently active."""
        today = timezone.now().date()
        return self.start_date <= today <= self.end_date
    
    def approve(self, user):
        """Approve this availability request."""
        self.approved = True
        self.approved_by = user
        self.approved_at = timezone.now()
        self.save()


class TechnicianShift(models.Model):
    """Define work shifts for technicians."""
    SHIFT_CHOICES = [
        ('MORNING', 'Morning (8AM-4PM)'),
        ('AFTERNOON', 'Afternoon (12PM-8PM)'),
        ('EVENING', 'Evening (4PM-12AM)'),
        ('NIGHT', 'Night (8PM-8AM)'),
        ('FULL_DAY', 'Full Day (8AM-5PM)'),
    ]
    
    DAY_CHOICES = [
        ('MONDAY', 'Monday'),
        ('TUESDAY', 'Tuesday'),
        ('WEDNESDAY', 'Wednesday'),
        ('THURSDAY', 'Thursday'),
        ('FRIDAY', 'Friday'),
        ('SATURDAY', 'Saturday'),
        ('SUNDAY', 'Sunday'),
    ]
    
    technician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='shifts',
        limit_choices_to={'role': 'MAINTENANCE_TECHNICIAN'}
    )
    day_of_week = models.CharField(max_length=10, choices=DAY_CHOICES)
    shift_type = models.CharField(max_length=20, choices=SHIFT_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['day_of_week', 'start_time']
        indexes = [
            models.Index(fields=['technician', 'day_of_week']),
            models.Index(fields=['is_active']),
        ]
        unique_together = ['technician', 'day_of_week', 'start_time']
    
    def __str__(self):
        return f"{self.technician.get_full_name()} - {self.get_day_of_week_display()} {self.get_shift_type_display()}"
