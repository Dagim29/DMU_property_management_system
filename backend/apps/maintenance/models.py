from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel

# Import inventory models
from .inventory_models import InventoryItem, PartsRequest, PartsRequestItem, StockTransaction
from apps.assets.models import Asset


class MaintenanceRequest(TimeStampedModel):
    """Maintenance request submitted by users."""
    PRIORITY_CHOICES = [
        ('EMERGENCY', 'Emergency'),
        ('HIGH', 'High'),
        ('MEDIUM', 'Medium'),
        ('LOW', 'Low'),
    ]
    
    STATUS_CHOICES = [
        ('SUBMITTED', 'Submitted'),
        ('ASSIGNED', 'Assigned'),
        ('IN_PROGRESS', 'In Progress'),
        ('WAITING_PARTS', 'Waiting for Parts'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    CATEGORY_CHOICES = [
        ('ELECTRICAL', 'Electrical'),
        ('PLUMBING', 'Plumbing'),
        ('HVAC', 'HVAC'),
        ('STRUCTURAL', 'Structural'),
        ('EQUIPMENT', 'Equipment Repair'),
        ('OTHER', 'Other'),
    ]
    
    request_id = models.CharField(max_length=50, unique=True, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='maintenance_requests')
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, 
                                      null=True, related_name='submitted_requests')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SUBMITTED')
    
    description = models.TextField()
    photo = models.ImageField(upload_to='maintenance/requests/', null=True, blank=True)
    
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, 
                                     null=True, blank=True, related_name='assigned_requests')
    escalated = models.BooleanField(default=False)
    escalation_date = models.DateTimeField(null=True, blank=True)
    
    # BR-MM-01: Emergency SLA tracking
    response_deadline = models.DateTimeField(null=True, blank=True, help_text="2-hour response for emergency")
    resolution_deadline = models.DateTimeField(null=True, blank=True, help_text="24-hour resolution for emergency")
    response_met = models.BooleanField(default=False)
    resolution_met = models.BooleanField(default=False)
    
    # BR-MM-03: Critical equipment tracking
    is_critical_equipment = models.BooleanField(default=False)
    max_delay_date = models.DateField(null=True, blank=True, help_text="Max 7-day delay for critical equipment")
    
    # BR-MM-04: Recurring issue tracking
    similar_issue_count = models.IntegerField(default=0, help_text="Count of similar issues in 30 days")
    auto_escalated = models.BooleanField(default=False)
    escalated_to_department_head = models.BooleanField(default=False)
    
    # BR-OW-01: After-hours request handling
    submitted_after_hours = models.BooleanField(default=False, help_text="Submitted between 6PM-8AM")
    scheduled_for_next_day = models.BooleanField(default=False)
    
    # BR-DM-02: Data retention (7 years for maintenance records)
    retention_date = models.DateField(null=True, blank=True, help_text="Delete after this date (7 years)")
    marked_for_deletion = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['request_id']),
            models.Index(fields=['status']),
            models.Index(fields=['priority']),
            models.Index(fields=['assigned_to']),
            models.Index(fields=['is_critical_equipment']),
            models.Index(fields=['auto_escalated']),
        ]
    
    def __str__(self):
        return f"{self.request_id} - {self.asset.asset_id}"
    
    def save(self, *args, **kwargs):
        if not self.request_id:
            from django.utils import timezone
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
            self.request_id = f"MR-{timestamp}"
        
        # BR-OW-01: Check if submitted after hours (6PM-8AM)
        from django.utils import timezone
        current_time = timezone.now()
        hour = current_time.hour
        
        if (hour >= 18 or hour < 8) and self.priority != 'EMERGENCY':
            self.submitted_after_hours = True
            self.scheduled_for_next_day = True
        
        # BR-DM-02: Set retention date (7 years from creation)
        if not self.retention_date:
            from datetime import timedelta
            self.retention_date = (current_time + timedelta(days=365*7)).date()
        
        # BR-MM-01: Set emergency deadlines
        if self.priority == 'EMERGENCY' and not self.response_deadline:
            from datetime import timedelta
            self.response_deadline = timezone.now() + timedelta(hours=2)
            self.resolution_deadline = timezone.now() + timedelta(hours=24)
        
        # BR-MM-03: Set critical equipment deadline
        if self.is_critical_equipment and not self.max_delay_date:
            from datetime import timedelta
            self.max_delay_date = (timezone.now() + timedelta(days=7)).date()
        
        super().save(*args, **kwargs)
    
    def get_sla_deadline(self):
        """Calculate SLA deadline based on priority."""
        from datetime import timedelta
        sla_hours = settings.SLA_TIMES.get(self.priority, 168)
        return self.created_at + timedelta(hours=sla_hours)
    
    def is_overdue(self):
        """Check if request is past SLA deadline."""
        from django.utils import timezone
        return timezone.now() > self.get_sla_deadline() and self.status not in ['COMPLETED', 'CANCELLED']
    
    def check_response_sla(self):
        """BR-MM-01: Check if 2-hour response SLA is met."""
        if self.priority == 'EMERGENCY' and self.response_deadline:
            from django.utils import timezone
            if self.status != 'SUBMITTED' and not self.response_met:
                self.response_met = timezone.now() <= self.response_deadline
                self.save(update_fields=['response_met'])
            return self.response_met
        return True
    
    def check_resolution_sla(self):
        """BR-MM-01: Check if 24-hour resolution SLA is met."""
        if self.priority == 'EMERGENCY' and self.resolution_deadline:
            from django.utils import timezone
            if self.status == 'COMPLETED' and not self.resolution_met:
                self.resolution_met = timezone.now() <= self.resolution_deadline
                self.save(update_fields=['resolution_met'])
            return self.resolution_met
        return True
    
    def check_critical_equipment_delay(self):
        """BR-MM-03: Check if critical equipment maintenance is within 7-day limit."""
        if self.is_critical_equipment and self.max_delay_date:
            from django.utils import timezone
            return timezone.now().date() <= self.max_delay_date
        return True
    
    def count_similar_issues(self):
        """BR-MM-04: Count similar issues in last 30 days."""
        from datetime import timedelta
        from django.utils import timezone
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        similar_count = MaintenanceRequest.objects.filter(
            asset=self.asset,
            category=self.category,
            created_at__gte=thirty_days_ago
        ).exclude(id=self.id).count()
        
        self.similar_issue_count = similar_count
        
        # Auto-escalate if 3+ similar issues
        if similar_count >= 3 and not self.auto_escalated:
            self.auto_escalated = True
            self.escalated_to_department_head = True
            self.escalation_date = timezone.now()
        
        self.save(update_fields=['similar_issue_count', 'auto_escalated', 
                                 'escalated_to_department_head', 'escalation_date'])
        
        return similar_count


class WorkOrder(TimeStampedModel):
    """Work order for maintenance tasks."""
    request = models.OneToOneField(MaintenanceRequest, on_delete=models.CASCADE, related_name='work_order')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, 
                                     null=True, related_name='work_orders')
    scheduled_date = models.DateTimeField(null=True, blank=True)
    estimated_hours = models.FloatField(null=True, blank=True, help_text="Estimated hours to complete")
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    notes = models.TextField(blank=True)
    cost_labor = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cost_materials = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cost_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # BR-MM-02: Finance approval for high costs
    requires_finance_approval = models.BooleanField(default=False)
    finance_approved = models.BooleanField(default=False)
    finance_approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                            null=True, blank=True, related_name='approved_work_orders')
    finance_approval_date = models.DateTimeField(null=True, blank=True)
    
    # BR-MM-05: External contractor tracking
    uses_external_contractor = models.BooleanField(default=False)
    contractor_name = models.CharField(max_length=200, blank=True)
    contractor_license = models.CharField(max_length=100, blank=True)
    contractor_license_valid = models.BooleanField(default=False)
    vendor_registered = models.BooleanField(default=False)
    
    # BR-MM-06: Dual sign-off
    supervisor_signed_off = models.BooleanField(default=False)
    supervisor_signoff_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                              null=True, blank=True, related_name='supervisor_signoffs')
    supervisor_signoff_date = models.DateTimeField(null=True, blank=True)
    
    requester_signed_off = models.BooleanField(default=False)
    requester_signoff_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                             null=True, blank=True, related_name='requester_signoffs')
    requester_signoff_date = models.DateTimeField(null=True, blank=True)
    
    fully_approved = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['requires_finance_approval', 'finance_approved']),
            models.Index(fields=['fully_approved']),
        ]
    
    def __str__(self):
        return f"WO-{self.id} for {self.request.request_id}"
    
    def save(self, *args, **kwargs):
        self.cost_total = self.cost_labor + self.cost_materials
        
        # BR-MM-02: Check if finance approval required
        if self.cost_total > 50000:
            self.requires_finance_approval = True
        
        # BR-MM-06: Check if fully approved
        if self.supervisor_signed_off and self.requester_signed_off:
            self.fully_approved = True
        
        super().save(*args, **kwargs)
    
    def can_be_completed(self):
        """Check if work order can be marked as completed."""
        # BR-MM-02: Must have finance approval if required
        if self.requires_finance_approval and not self.finance_approved:
            return False, "Finance approval required for costs over 50,000 ETB"
        
        # BR-MM-05: Must have valid contractor if external
        if self.uses_external_contractor:
            if not self.contractor_license_valid:
                return False, "Contractor must have valid license"
            if not self.vendor_registered:
                return False, "Contractor must be registered as vendor"
        
        return True, "Can be completed"
    
    def supervisor_signoff(self, user):
        """BR-MM-06: Supervisor signs off on completed work."""
        from django.utils import timezone
        self.supervisor_signed_off = True
        self.supervisor_signoff_by = user
        self.supervisor_signoff_date = timezone.now()
        self.save()
    
    def requester_signoff(self, user):
        """BR-MM-06: Requester signs off on completed work."""
        from django.utils import timezone
        self.requester_signed_off = True
        self.requester_signoff_by = user
        self.requester_signoff_date = timezone.now()
        self.save()
    
    def approve_finance(self, user):
        """BR-MM-02: Finance approves high-cost work order."""
        from django.utils import timezone
        self.finance_approved = True
        self.finance_approved_by = user
        self.finance_approval_date = timezone.now()
        self.save()


class PreventiveMaintenance(TimeStampedModel):
    """Scheduled preventive maintenance tasks."""
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='preventive_schedules')
    description = models.TextField()
    interval_days = models.PositiveIntegerField(help_text="Maintenance interval in days")
    next_due_date = models.DateField()
    assigned_team = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['next_due_date']
    
    def __str__(self):
        return f"PM for {self.asset.asset_id} - Due: {self.next_due_date}"
    
    def update_next_due_date(self):
        """Update next due date after completion."""
        from datetime import timedelta
        self.next_due_date = self.next_due_date + timedelta(days=self.interval_days)
        self.save()



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
        MaintenanceRequest,
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
        MaintenanceRequest,
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


# ── Feature 1: Photo Evidence ──────────────────────────────────────────────

class WorkOrderPhoto(TimeStampedModel):
    """Before/after photo evidence for work orders."""
    PHOTO_TYPES = [
        ('before', 'Before Work'),
        ('after', 'After Work'),
        ('progress', 'During Work'),
        ('issue', 'Issue Found'),
    ]

    work_order = models.ForeignKey(
        WorkOrder,
        on_delete=models.CASCADE,
        related_name='photos'
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='work_order_photos'
    )
    photo = models.ImageField(upload_to='work_orders/photos/')
    photo_type = models.CharField(max_length=20, choices=PHOTO_TYPES, default='progress')
    caption = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['photo_type', '-created_at']

    def __str__(self):
        return f"Photo ({self.photo_type}) for WO-{self.work_order_id}"


# ── Feature 2: Work Order Checklist ────────────────────────────────────────

class ChecklistTemplate(TimeStampedModel):
    """Reusable checklist templates per maintenance category."""
    CATEGORY_CHOICES = [
        ('ELECTRICAL', 'Electrical'),
        ('PLUMBING', 'Plumbing'),
        ('HVAC', 'HVAC'),
        ('STRUCTURAL', 'Structural'),
        ('EQUIPMENT', 'Equipment Repair'),
        ('OTHER', 'Other'),
        ('GENERAL', 'General'),
    ]

    name = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='GENERAL')
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.category})"


class ChecklistItem(models.Model):
    """Individual item in a checklist template."""
    template = models.ForeignKey(ChecklistTemplate, on_delete=models.CASCADE, related_name='items')
    text = models.CharField(max_length=300)
    is_required = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.text


class WorkOrderChecklist(TimeStampedModel):
    """Checklist instance attached to a specific work order."""
    work_order = models.OneToOneField(WorkOrder, on_delete=models.CASCADE, related_name='checklist')
    template = models.ForeignKey(ChecklistTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='completed_checklists'
    )
    completed_at = models.DateTimeField(null=True, blank=True)

    @property
    def completion_percentage(self):
        total = self.entries.count()
        if total == 0:
            return 0
        checked = self.entries.filter(is_checked=True).count()
        return round((checked / total) * 100)

    @property
    def is_complete(self):
        return self.entries.filter(is_required=True, is_checked=False).count() == 0

    def __str__(self):
        return f"Checklist for WO-{self.work_order_id}"


class ChecklistEntry(models.Model):
    """A single checklist item response on a work order."""
    checklist = models.ForeignKey(WorkOrderChecklist, on_delete=models.CASCADE, related_name='entries')
    item_text = models.CharField(max_length=300)
    is_required = models.BooleanField(default=True)
    is_checked = models.BooleanField(default=False)
    notes = models.CharField(max_length=300, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{'✓' if self.is_checked else '○'} {self.item_text}"


# ── Feature 13: Work Order Messages ────────────────────────────────────────

class WorkOrderMessage(TimeStampedModel):
    """Direct messages between technician and supervisor tied to a work order."""
    work_order = models.ForeignKey(
        WorkOrder,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_wo_messages'
    )
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message on WO-{self.work_order_id} by {self.sender.get_full_name()}"
