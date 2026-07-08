from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta


class User(AbstractUser):
    """Custom user model with role-based access."""
    ROLE_CHOICES = [
        ('SUPER_ADMIN', 'Super Admin'),
        ('PROPERTY_MANAGER', 'Property Manager'),
        ('MAINTENANCE_SUPERVISOR', 'Maintenance Supervisor'),
        ('MAINTENANCE_TECHNICIAN', 'Maintenance Technician'),
        ('OWNER', 'Owner'),
    ]
    
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='OWNER')
    department = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email_verified = models.BooleanField(default=False)
    profile_photo = models.ImageField(upload_to='users/profiles/', null=True, blank=True)
    
    # Technician specialization for automatic routing
    specialization = models.CharField(
        max_length=20, 
        blank=True,
        choices=[
            ('ELECTRICAL', 'Electrical'),
            ('PLUMBING', 'Plumbing'),
            ('HVAC', 'HVAC'),
            ('STRUCTURAL', 'Structural'),
            ('EQUIPMENT', 'Equipment Repair'),
            ('GENERAL', 'General Maintenance'),
        ],
        help_text="Primary specialization for maintenance technicians"
    )
    assigned_campus = models.CharField(max_length=100, blank=True, help_text="Primary campus assignment")
    certifications = models.TextField(blank=True, help_text="List of certifications, licenses, and qualifications")
    certificate_file = models.FileField(upload_to='users/certificates/', null=True, blank=True, help_text="Uploaded certificate document")
    
    # Technician performance score (auto-calculated from service ratings)
    performance_score = models.FloatField(
        default=0.0,
        help_text="Auto-calculated average score from service ratings (0-100)"
    )
    total_ratings = models.IntegerField(default=0, help_text="Total number of ratings received")
    
    # BR-UM-04: Inactive account tracking
    last_activity = models.DateTimeField(null=True, blank=True, help_text="Last activity timestamp")
    inactivity_warning_sent = models.BooleanField(default=False, help_text="30-day warning sent")
    inactivity_warning_date = models.DateTimeField(null=True, blank=True)
    auto_disabled_date = models.DateTimeField(null=True, blank=True)
    
    # BR-UM-05: Password expiration tracking
    password_changed_at = models.DateTimeField(null=True, blank=True, help_text="Last password change date")
    password_expires_at = models.DateTimeField(null=True, blank=True, help_text="Password expiration date")
    password_change_required = models.BooleanField(default=False, help_text="Force password change on next login")
    
    # Two-Factor Authentication (2FA)
    two_fa_enabled = models.BooleanField(default=False, help_text="Whether 2FA is enabled for this user")
    two_fa_secret = models.CharField(max_length=32, blank=True, help_text="TOTP secret key")
    two_fa_method = models.CharField(
        max_length=10,
        choices=[('TOTP', 'Authenticator App'), ('SMS', 'SMS')],
        default='TOTP',
        blank=True,
        help_text="2FA method"
    )
    two_fa_enabled_at = models.DateTimeField(null=True, blank=True, help_text="When 2FA was enabled")
    backup_codes = models.JSONField(default=list, blank=True, help_text="Backup codes for 2FA recovery")
    
    class Meta:
        ordering = ['username']
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['email']),
            models.Index(fields=['last_activity']),
            models.Index(fields=['password_expires_at']),
        ]

    def __str__(self):
        return f"{self.get_full_name()} ({self.get_role_display()})"
    
    def update_last_activity(self):
        """Update last activity timestamp."""
        self.last_activity = timezone.now()
        self.save(update_fields=['last_activity'])
    
    def get_password_expiry_days(self):
        """Get password expiry period based on role."""
        if self.role in ['SUPER_ADMIN', 'PROPERTY_MANAGER', 'MAINTENANCE_SUPERVISOR']:
            return 90  # Admin accounts: 90 days
        return 180  # Regular staff: 180 days
    
    def set_password_expiry(self):
        """Set password expiration date based on role."""
        self.password_changed_at = timezone.now()
        self.password_expires_at = timezone.now() + timedelta(days=self.get_password_expiry_days())
        self.password_change_required = False
    
    def is_password_expired(self):
        """Check if password has expired."""
        if not self.password_expires_at:
            return False
        return timezone.now() > self.password_expires_at
    
    def days_until_password_expires(self):
        """Get days until password expires."""
        if not self.password_expires_at:
            return None
        delta = self.password_expires_at - timezone.now()
        return max(0, delta.days)
    
    def is_inactive(self):
        """Check if user has been inactive for 180 days."""
        if not self.last_activity:
            return False
        inactive_threshold = timezone.now() - timedelta(days=180)
        return self.last_activity < inactive_threshold
    
    def days_since_last_activity(self):
        """Get days since last activity."""
        if not self.last_activity:
            return None
        delta = timezone.now() - self.last_activity
        return delta.days
    
    def should_send_inactivity_warning(self):
        """Check if 30-day inactivity warning should be sent."""
        if not self.last_activity or self.inactivity_warning_sent:
            return False
        days_inactive = self.days_since_last_activity()
        return days_inactive >= 150  # 180 - 30 = 150 days


class UserSession(models.Model):
    """Track user sessions for BR-UM-06: Concurrent session detection."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    session_key = models.CharField(max_length=40, unique=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    device_info = models.CharField(max_length=255, blank=True)
    location = models.CharField(max_length=255, blank=True)
    login_time = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-login_time']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['session_key']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.ip_address} - {self.login_time}"
    
    def terminate(self):
        """Terminate this session."""
        self.is_active = False
        self.save()


class SecurityAlert(models.Model):
    """Security alerts for suspicious activities."""
    ALERT_TYPES = [
        ('CONCURRENT_SESSION', 'Concurrent Session Detected'),
        ('PASSWORD_EXPIRED', 'Password Expired'),
        ('INACTIVITY_WARNING', 'Inactivity Warning'),
        ('ACCOUNT_DISABLED', 'Account Auto-Disabled'),
        ('FAILED_LOGIN', 'Failed Login Attempt'),
        ('SUSPICIOUS_LOCATION', 'Suspicious Location'),
    ]
    
    SEVERITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='security_alerts')
    alert_type = models.CharField(max_length=30, choices=ALERT_TYPES)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='MEDIUM')
    message = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    acknowledged = models.BooleanField(default=False)
    acknowledged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='acknowledged_alerts')
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'acknowledged']),
            models.Index(fields=['alert_type']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_alert_type_display()} - {self.user.username} - {self.created_at}"



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
        User,
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
        User,
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
        User,
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


class IPAccessControl(models.Model):
    """IP whitelist and blacklist for access control."""
    TYPE_CHOICES = [
        ('WHITELIST', 'Whitelist'),
        ('BLACKLIST', 'Blacklist'),
    ]
    
    ip_address = models.CharField(max_length=100, help_text="IP address, CIDR notation, or IP range")
    list_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    description = models.TextField(blank=True)
    
    # Tracking
    added_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='added_ip_rules')
    added_at = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(null=True, blank=True)
    block_count = models.IntegerField(default=0, help_text="Number of times this rule blocked access")
    
    # Geolocation (optional)
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-added_at']
        indexes = [
            models.Index(fields=['list_type', 'is_active']),
            models.Index(fields=['ip_address']),
        ]
        verbose_name = 'IP Access Control'
        verbose_name_plural = 'IP Access Controls'
    
    def __str__(self):
        return f"{self.get_list_type_display()}: {self.ip_address}"
    
    def increment_block_count(self):
        """Increment the block count when this rule blocks access."""
        self.block_count += 1
        self.last_used = timezone.now()
        self.save(update_fields=['block_count', 'last_used'])


class FailedLoginAttempt(models.Model):
    """Track failed login attempts for security monitoring."""
    username = models.CharField(max_length=150)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    attempt_time = models.DateTimeField(auto_now_add=True)
    reason = models.CharField(max_length=100, blank=True, help_text="Reason for failure")
    
    # Geolocation (optional)
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    
    class Meta:
        ordering = ['-attempt_time']
        indexes = [
            models.Index(fields=['username', 'ip_address']),
            models.Index(fields=['attempt_time']),
        ]
    
    def __str__(self):
        return f"{self.username} from {self.ip_address} at {self.attempt_time}"


class TimeEntry(models.Model):
    """Track technician clock-in/clock-out sessions."""
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
    ]

    technician = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='time_entries',
        limit_choices_to={'role': 'MAINTENANCE_TECHNICIAN'}
    )
    clock_in = models.DateTimeField()
    clock_out = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    class Meta:
        ordering = ['-clock_in']
        indexes = [
            models.Index(fields=['technician', 'clock_in']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.technician.get_full_name()} - {self.clock_in.date()}"

    @property
    def total_hours(self):
        if self.clock_out:
            delta = self.clock_out - self.clock_in
            return round(delta.total_seconds() / 3600, 2)
        return None

    @property
    def is_active(self):
        return self.status == 'active' and self.clock_out is None


# ── Feature 3: Skill Badge System ──────────────────────────────────────────

class TechnicianBadge(models.Model):
    """Badge definitions."""
    BADGE_TYPES = [
        ('emergency_responder', '🚨 Emergency Responder'),
        ('five_star',           '⭐ 5-Star Technician'),
        ('speed_demon',         '⚡ Speed Demon'),
        ('reliable',            '🏆 Reliable'),
        ('century_club',        '💯 Century Club'),
        ('first_complete',      '🎯 First Complete'),
        ('team_player',         '🤝 Team Player'),
        ('veteran',             '🎖 Veteran'),
    ]

    BADGE_DESCRIPTIONS = {
        'emergency_responder': 'Completed 5+ emergency work orders',
        'five_star':           'Achieved average rating ≥ 4.5 stars',
        'speed_demon':         'Average completion time under 2 hours',
        'reliable':            'Completed 20+ work orders total',
        'century_club':        'Performance score reached 80+',
        'first_complete':      'Completed first work order',
        'team_player':         'Received 5+ ratings from owners',
        'veteran':             'Completed 50+ work orders total',
    }

    technician = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='badges',
        limit_choices_to={'role': 'MAINTENANCE_TECHNICIAN'}
    )
    badge_type = models.CharField(max_length=30, choices=BADGE_TYPES)
    awarded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['technician', 'badge_type']
        ordering = ['-awarded_at']

    def __str__(self):
        return f"{self.technician.get_full_name()} — {self.get_badge_type_display()}"

    @property
    def description(self):
        return self.BADGE_DESCRIPTIONS.get(self.badge_type, '')
