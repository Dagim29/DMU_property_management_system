from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel
import qrcode
from io import BytesIO
from django.core.files import File


class Campus(TimeStampedModel):
    """University campus."""
    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=100)
    address = models.TextField(blank=True)
    
    class Meta:
        verbose_name_plural = "Campuses"
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class Building(TimeStampedModel):
    """Building within a campus."""
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name='buildings')
    code = models.CharField(max_length=10)
    name = models.CharField(max_length=100)
    floors_count = models.PositiveIntegerField(default=1)
    
    class Meta:
        ordering = ['campus', 'name']
        unique_together = ['campus', 'code']
    
    def __str__(self):
        return f"{self.campus.code}-{self.name}"


class Floor(TimeStampedModel):
    """Floor within a building."""
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='floors')
    number = models.IntegerField()
    name = models.CharField(max_length=100, blank=True)
    
    class Meta:
        ordering = ['building', 'number']
        unique_together = ['building', 'number']
    
    def __str__(self):
        return f"{self.building} - Floor {self.number}"


class Room(TimeStampedModel):
    """Room within a floor."""
    floor = models.ForeignKey(Floor, on_delete=models.CASCADE, related_name='rooms')
    number = models.CharField(max_length=20)
    name = models.CharField(max_length=100, blank=True)
    room_type = models.CharField(max_length=50, blank=True)
    
    class Meta:
        ordering = ['floor', 'number']
        unique_together = ['floor', 'number']
    
    def __str__(self):
        return f"{self.floor.building.code}-{self.floor.number}-{self.number}"


class AssetSequence(models.Model):
    """Track asset ID sequences per campus and type."""
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE)
    asset_type_code = models.CharField(max_length=10)
    last_sequence = models.PositiveIntegerField(default=0)
    
    class Meta:
        unique_together = ['campus', 'asset_type_code']
    
    @classmethod
    def get_next_sequence(cls, campus, asset_type_code):
        """Get next sequence number for asset ID generation."""
        obj, created = cls.objects.get_or_create(
            campus=campus,
            asset_type_code=asset_type_code,
            defaults={'last_sequence': 0}
        )
        obj.last_sequence += 1
        obj.save()
        return obj.last_sequence


class Asset(TimeStampedModel):
    """Main asset model with business rule enforcement."""
    STATUS_CHOICES = [
        ('AVAILABLE', 'Available'),
        ('IN_USE', 'In Use'),
        ('UNDER_MAINTENANCE', 'Under Maintenance'),
        ('CONDEMNED', 'Condemned'),
        ('PENDING_DISPOSAL', 'Pending Disposal'),
    ]
    
    TYPE_CHOICES = [
        ('EQP', 'Equipment'),
        ('FUR', 'Furniture'),
        ('VEH', 'Vehicle'),
        ('BLD', 'Building Component'),
        ('OTH', 'Other'),
    ]
    
    asset_id = models.CharField(max_length=50, unique=True, editable=False)
    name = models.CharField(max_length=200)
    asset_type = models.CharField(max_length=3, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    campus = models.ForeignKey(Campus, on_delete=models.PROTECT, related_name='assets')
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True, related_name='assets')
    
    purchase_date = models.DateField(null=True, blank=True)
    purchase_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    current_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Asset identification and details
    manufacturer = models.CharField(max_length=200, blank=True, help_text="Manufacturer or brand name")
    model_number = models.CharField(max_length=100, blank=True, help_text="Model number or identifier")
    serial_number = models.CharField(max_length=100, blank=True, unique=True, null=True, 
                                     help_text="Unique serial number")
    condition = models.CharField(max_length=20, choices=[
        ('EXCELLENT', 'Excellent'),
        ('GOOD', 'Good'),
        ('FAIR', 'Fair'),
        ('POOR', 'Poor'),
    ], default='GOOD', help_text="Physical condition of the asset")
    supplier = models.CharField(max_length=200, blank=True, help_text="Supplier or vendor name")
    
    specifications = models.JSONField(default=dict, blank=True)
    description = models.TextField(blank=True)
    photo = models.ImageField(upload_to='assets/photos/', null=True, blank=True)
    qr_code = models.ImageField(upload_to='assets/qrcodes/', null=True, blank=True)
    
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, 
                                     null=True, blank=True, related_name='assigned_assets')
    
    # BR-AM-01: Registration tracking for high-value assets
    registration_deadline = models.DateField(null=True, blank=True, 
                                            help_text="Deadline for registering assets >10,000 ETB")
    is_high_value = models.BooleanField(default=False, 
                                       help_text="Asset value exceeds 10,000 ETB")
    registration_overdue = models.BooleanField(default=False)
    
    # BR-AM-04: Annual verification tracking
    last_verification_date = models.DateField(null=True, blank=True)
    next_verification_date = models.DateField(null=True, blank=True)
    verification_status = models.CharField(max_length=20, choices=[
        ('PENDING', 'Pending Verification'),
        ('VERIFIED', 'Verified'),
        ('DISCREPANCY', 'Discrepancy Found'),
        ('NOT_REQUIRED', 'Not Required'),
    ], default='NOT_REQUIRED')

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['asset_id']),
            models.Index(fields=['status']),
            models.Index(fields=['asset_type']),
            models.Index(fields=['campus']),
            models.Index(fields=['is_high_value']),
            models.Index(fields=['registration_deadline']),
            models.Index(fields=['next_verification_date']),
            models.Index(fields=['serial_number']),
            models.Index(fields=['manufacturer']),
        ]
    
    def __str__(self):
        return f"{self.asset_id} - {self.name}"
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        
        # BR-AM-06: Generate asset ID with format DMU-[Campus]-[Type]-[Number]
        if not self.asset_id:
            sequence = AssetSequence.get_next_sequence(self.campus, self.asset_type)
            self.asset_id = f"DMU-{self.campus.code}-{self.asset_type}-{sequence:05d}"
        
        # BR-AM-01: Check if asset is high-value and set registration deadline
        if self.purchase_cost and self.purchase_cost > 10000:
            self.is_high_value = True
            if not self.registration_deadline and self.purchase_date:
                from datetime import timedelta
                self.registration_deadline = self.purchase_date + timedelta(days=7)
        
        super().save(*args, **kwargs)
        
        # Generate QR code after save so self.id is available
        if is_new and not self.qr_code:
            self.generate_qr_code()
            super().save(update_fields=['qr_code'])
    
    def generate_qr_code(self):
        """Generate QR code for asset ID."""
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        asset_url = f"{frontend_url}/dashboard/assets/{self.id}"
        
        qr_data = (
            f"📦 ASSET DETAILS\n"
            f"━━━━━━━━━━━━━━━\n"
            f"ID: {self.asset_id}\n"
            f"Name: {self.name}\n"
            f"Type: {self.get_asset_type_display()}\n"
            f"Status: {self.get_status_display()}\n"
            f"Location: {self.room if self.room else 'Unassigned'}\n"
            f"━━━━━━━━━━━━━━━\n"
            f"Link: {asset_url}"
        )
        
        qr.add_data(qr_data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        file_name = f'{self.asset_id}.png'
        self.qr_code.save(file_name, File(buffer), save=False)
    
    def can_be_transferred(self):
        """BR-AM-05: Check if asset can be transferred."""
        return self.status != 'UNDER_MAINTENANCE'
    
    def is_registration_overdue(self):
        """BR-AM-01: Check if registration is overdue."""
        if not self.is_high_value or not self.registration_deadline:
            return False
        from datetime import date
        return date.today() > self.registration_deadline
    
    def days_until_verification(self):
        """BR-AM-04: Days until next verification."""
        if not self.next_verification_date:
            return None
        from datetime import date
        delta = self.next_verification_date - date.today()
        return delta.days
    
    def is_verification_overdue(self):
        """BR-AM-04: Check if verification is overdue."""
        if not self.next_verification_date:
            return False
        from datetime import date
        return date.today() > self.next_verification_date


class AssetTransfer(TimeStampedModel):
    """Track asset location transfers - Direct manager transfer (simplified)."""
    APPROVAL_STATUS_CHOICES = [
        ('PENDING', 'Pending Transfer'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    TRANSFER_TYPE_CHOICES = [
        ('PERMANENT', 'Permanent Transfer'),
        ('TEMPORARY', 'Temporary Transfer'),
        ('EMERGENCY', 'Emergency Transfer'),
    ]
    
    REASON_CATEGORY_CHOICES = [
        ('DEPT_RELOCATION', 'Department Relocation'),
        ('SPACE_OPTIMIZATION', 'Space Optimization'),
        ('MAINTENANCE', 'Maintenance Requirements'),
        ('USER_REQUEST', 'User Request'),
        ('EQUIPMENT_UPGRADE', 'Equipment Upgrade'),
        ('OTHER', 'Other'),
    ]
    
    TRANSPORTATION_METHOD_CHOICES = [
        ('MANUAL', 'Manual Carry'),
        ('CART', 'Cart/Trolley'),
        ('VEHICLE', 'Vehicle Transport'),
        ('PROFESSIONAL', 'Professional Movers'),
    ]
    
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='transfers')
    from_room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, 
                                   related_name='transfers_from')
    to_room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, 
                                 related_name='transfers_to')
    transfer_date = models.DateTimeField(auto_now_add=True)
    completed_date = models.DateTimeField(null=True, blank=True)
    reason = models.TextField(blank=True)
    
    # Enhanced transfer details
    transfer_type = models.CharField(max_length=20, choices=TRANSFER_TYPE_CHOICES, default='PERMANENT')
    reason_category = models.CharField(max_length=30, choices=REASON_CATEGORY_CHOICES, blank=True)
    scheduled_date = models.DateField(null=True, blank=True, help_text="Planned transfer date")
    transportation_method = models.CharField(max_length=20, choices=TRANSPORTATION_METHOD_CHOICES, blank=True)
    special_requirements = models.TextField(blank=True, help_text="Special handling requirements")
    
    # Manager who performed the transfer
    transferred_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, 
                                       null=True, related_name='performed_transfers')
    approval_status = models.CharField(max_length=20, choices=APPROVAL_STATUS_CHOICES, default='PENDING')
    notes = models.TextField(blank=True, help_text="Additional notes or observations")
    
    class Meta:
        ordering = ['-transfer_date']
        indexes = [
            models.Index(fields=['asset', 'approval_status']),
            models.Index(fields=['approval_status']),
            models.Index(fields=['transfer_type']),
            models.Index(fields=['scheduled_date']),
        ]
    
    def __str__(self):
        return f"{self.asset.asset_id} transfer on {self.transfer_date.date()}"
    
    @property
    def source_campus_name(self):
        """Get source campus name."""
        if self.from_room and self.from_room.floor and self.from_room.floor.building:
            return self.from_room.floor.building.campus.name
        return None
    
    @property
    def dest_campus_name(self):
        """Get destination campus name."""
        if self.to_room and self.to_room.floor and self.to_room.floor.building:
            return self.to_room.floor.building.campus.name
        return None
    
    def complete_transfer(self):
        """Complete the transfer and update asset location."""
        from django.utils import timezone
        
        # Update asset location
        self.asset.room = self.to_room
        if self.to_room and self.to_room.floor and self.to_room.floor.building:
            self.asset.campus = self.to_room.floor.building.campus
        self.asset.save()
        
        # Mark transfer as completed
        self.approval_status = 'COMPLETED'
        self.completed_date = timezone.now()
        self.save()
        
        return True
        """Check if user can approve as source department - must be PM in source campus."""
        if self.approval_status != 'PENDING':
            return False
        
        if user.role not in ['SUPER_ADMIN', 'PROPERTY_MANAGER']:
            return False
        
        # Property manager must be in source campus
        if user.role == 'PROPERTY_MANAGER' and self.from_room:
            source_campus = self.from_room.floor.building.campus
            # Check if user manages this campus (you may need to add campus field to User model)
            return True  # For now, allow any PM
        
        return user.role == 'SUPER_ADMIN'
    
    def can_approve_dest(self, user):
        """Check if user can approve as destination department - must be PM in dest campus."""
        if self.approval_status != 'APPROVED_SOURCE':
            return False
        
        if user.role not in ['SUPER_ADMIN', 'PROPERTY_MANAGER']:
            return False
        
        # Property manager must be in destination campus
        if user.role == 'PROPERTY_MANAGER' and self.to_room:
            dest_campus = self.to_room.floor.building.campus
            # Check if user manages this campus
            return True  # For now, allow any PM
        
        return user.role == 'SUPER_ADMIN'
    
    def approve_source(self, user):
        """Approve transfer from source department."""
        if not self.can_approve_source(user):
            raise ValueError("Cannot approve at this stage or insufficient permissions")
        
        from django.utils import timezone
        self.source_department_head = user
        self.source_approved_at = timezone.now()
        self.approval_status = 'APPROVED_SOURCE'
        self.save()
    
    def approve_dest(self, user):
        """Approve transfer from destination department."""
        if not self.can_approve_dest(user):
            raise ValueError("Cannot approve at this stage or insufficient permissions")
        
        from django.utils import timezone
        self.dest_department_head = user
        self.dest_approved_at = timezone.now()
        self.approval_status = 'FULLY_APPROVED'
        self.save()
    
    def reject(self, user, reason):
        """Reject the transfer."""
        self.approval_status = 'REJECTED'
        self.rejection_reason = reason
        self.save()
    
    @property
    def is_source_overdue(self):
        """Check if source approval is overdue."""
        if self.approval_status != 'PENDING' or not self.source_approval_deadline:
            return False
        from django.utils import timezone
        return timezone.now() > self.source_approval_deadline
    
    @property
    def is_dest_overdue(self):
        """Check if destination approval is overdue."""
        if self.approval_status != 'APPROVED_SOURCE' or not self.dest_approval_deadline:
            return False
        from django.utils import timezone
        return timezone.now() > self.dest_approval_deadline
    
    @property
    def source_campus_name(self):
        """Get source campus name."""
        if self.from_room and self.from_room.floor and self.from_room.floor.building:
            return self.from_room.floor.building.campus.name
        return None
    
    @property
    def dest_campus_name(self):
        """Get destination campus name."""
        if self.to_room and self.to_room.floor and self.to_room.floor.building:
            return self.to_room.floor.building.campus.name
        return None



class AssetWarranty(TimeStampedModel):
    """Warranty information for assets."""
    asset = models.OneToOneField(Asset, on_delete=models.CASCADE, related_name='warranty')
    provider = models.CharField(max_length=200)
    warranty_number = models.CharField(max_length=100, blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    coverage_details = models.TextField(blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    
    class Meta:
        verbose_name_plural = "Asset Warranties"
        ordering = ['end_date']
    
    def __str__(self):
        return f"Warranty for {self.asset.asset_id}"
    
    def is_active(self):
        from datetime import date
        return self.start_date <= date.today() <= self.end_date
    
    def days_until_expiry(self):
        from datetime import date
        if self.end_date < date.today():
            return 0
        return (self.end_date - date.today()).days


class AssetInsurance(TimeStampedModel):
    """Insurance information for assets."""
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='insurance_policies')
    policy_number = models.CharField(max_length=100, unique=True)
    provider = models.CharField(max_length=200)
    policy_type = models.CharField(max_length=50, choices=[
        ('COMPREHENSIVE', 'Comprehensive'),
        ('THEFT', 'Theft Only'),
        ('DAMAGE', 'Damage Only'),
        ('LIABILITY', 'Liability'),
        ('OTHER', 'Other')
    ])
    coverage_amount = models.DecimalField(max_digits=12, decimal_places=2)
    premium_amount = models.DecimalField(max_digits=10, decimal_places=2)
    start_date = models.DateField()
    end_date = models.DateField()
    renewal_date = models.DateField()
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-end_date']
    
    def __str__(self):
        return f"Insurance {self.policy_number} for {self.asset.asset_id}"
    
    def is_active(self):
        from datetime import date
        return self.start_date <= date.today() <= self.end_date
    
    def days_until_renewal(self):
        from datetime import date
        if self.renewal_date < date.today():
            return 0
        return (self.renewal_date - date.today()).days


class AssetCheckout(TimeStampedModel):
    """Track asset checkout/check-in."""
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='checkouts')
    checked_out_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, 
                                        null=True, related_name='checked_out_assets')
    checked_out_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, 
                                        null=True, related_name='checkout_approvals')
    checkout_date = models.DateTimeField(auto_now_add=True)
    expected_return_date = models.DateField()
    actual_return_date = models.DateTimeField(null=True, blank=True)
    
    checkout_condition = models.CharField(max_length=20, choices=[
        ('EXCELLENT', 'Excellent'),
        ('GOOD', 'Good'),
        ('FAIR', 'Fair'),
        ('POOR', 'Poor')
    ], default='GOOD')
    return_condition = models.CharField(max_length=20, choices=[
        ('EXCELLENT', 'Excellent'),
        ('GOOD', 'Good'),
        ('FAIR', 'Fair'),
        ('POOR', 'Poor'),
        ('DAMAGED', 'Damaged')
    ], blank=True)
    
    purpose = models.TextField()
    notes = models.TextField(blank=True)
    is_returned = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-checkout_date']
    
    def __str__(self):
        return f"{self.asset.asset_id} - {self.checked_out_to}"
    
    def is_overdue(self):
        from datetime import date
        return not self.is_returned and date.today() > self.expected_return_date


class CheckoutExtensionRequest(TimeStampedModel):
    """Track checkout extension requests and approvals."""
    STATUS_CHOICES = [
        ('PENDING', 'Pending Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    
    checkout = models.ForeignKey(AssetCheckout, on_delete=models.CASCADE, related_name='extension_requests')
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                     null=True, related_name='checkout_extension_requests')
    request_date = models.DateTimeField(auto_now_add=True)
    
    current_return_date = models.DateField(help_text="Current expected return date")
    requested_return_date = models.DateField(help_text="Requested new return date")
    reason = models.TextField(help_text="Reason for extension request")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   null=True, blank=True, related_name='reviewed_extension_requests')
    review_date = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True, help_text="Manager's notes on approval/rejection")
    
    class Meta:
        ordering = ['-request_date']
        indexes = [
            models.Index(fields=['checkout', 'status']),
            models.Index(fields=['status']),
            models.Index(fields=['requested_by']),
        ]
    
    def __str__(self):
        return f"Extension Request for {self.checkout.asset.asset_id} by {self.requested_by}"
    
    def can_approve(self, user):
        """Check if user can approve this extension request."""
        return (self.status == 'PENDING' and 
                user.role in ['SUPER_ADMIN', 'PROPERTY_MANAGER', 'MAINTENANCE_SUPERVISOR'])
    
    def approve(self, user, notes=''):
        """Approve the extension request and update checkout."""
        if not self.can_approve(user):
            raise ValueError("Cannot approve this request")
        
        from django.utils import timezone
        self.status = 'APPROVED'
        self.reviewed_by = user
        self.review_date = timezone.now()
        self.review_notes = notes
        self.save()
        
        # Update checkout expected return date
        self.checkout.expected_return_date = self.requested_return_date
        self.checkout.save()
    
    def reject(self, user, notes=''):
        """Reject the extension request."""
        if not self.can_approve(user):
            raise ValueError("Cannot reject this request")
        
        from django.utils import timezone
        self.status = 'REJECTED'
        self.reviewed_by = user
        self.review_date = timezone.now()
        self.review_notes = notes
        self.save()


class AssetDocument(TimeStampedModel):
    """Documents attached to assets."""
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=200)
    document_type = models.CharField(max_length=50, choices=[
        ('MANUAL', 'User Manual'),
        ('WARRANTY', 'Warranty Document'),
        ('INVOICE', 'Invoice/Receipt'),
        ('CERTIFICATE', 'Certificate'),
        ('PHOTO', 'Photo'),
        ('OTHER', 'Other')
    ])
    file = models.FileField(upload_to='assets/documents/')
    description = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.asset.asset_id}"


class Budget(TimeStampedModel):
    """Budget allocation for departments/campuses."""
    name = models.CharField(max_length=200)
    fiscal_year = models.IntegerField()
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name='budgets', null=True, blank=True)
    department = models.CharField(max_length=100, blank=True)
    
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    allocated_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    spent_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    start_date = models.DateField()
    end_date = models.DateField()
    
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-fiscal_year', 'name']
        unique_together = ['name', 'fiscal_year']
    
    def __str__(self):
        return f"{self.name} - FY{self.fiscal_year}"
    
    def remaining_amount(self):
        return self.total_amount - self.spent_amount
    
    def utilization_percentage(self):
        if self.total_amount == 0:
            return 0
        return (self.spent_amount / self.total_amount) * 100


class BudgetTransaction(TimeStampedModel):
    """Track budget transactions."""
    budget = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=[
        ('PURCHASE', 'Asset Purchase'),
        ('MAINTENANCE', 'Maintenance Cost'),
        ('TRANSFER', 'Budget Transfer'),
        ('ADJUSTMENT', 'Adjustment')
    ])
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField()
    reference_number = models.CharField(max_length=100, blank=True)
    asset = models.ForeignKey(Asset, on_delete=models.SET_NULL, null=True, blank=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    transaction_date = models.DateField(auto_now_add=True)
    
    class Meta:
        ordering = ['-transaction_date']
    
    def __str__(self):
        return f"{self.transaction_type} - {self.amount}"


class AssetEvent(TimeStampedModel):
    """Immutable record of asset lifecycle events."""
    EVENT_TYPES = [
        ('CHECKOUT', 'Checkout'),
        ('RETURN', 'Return'),
        ('CHECKED_IN', 'Checked In'),
        ('RETURN_INITIATED', 'Return Initiated'),
        ('MAINTENANCE_REQUEST', 'Maintenance Request'),
        ('MAINTENANCE_COMPLETE', 'Maintenance Complete'),
        ('CONDITION_CHANGE', 'Condition Change'),
        ('TRANSFER', 'Transfer'),
        ('ASSIGNMENT', 'Assignment'),
    ]

    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='events')
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    event_date = models.DateTimeField(auto_now_add=True)

    # Polymorphic event data stored as JSON
    event_data = models.JSONField(default=dict)

    # References to related objects
    related_checkout = models.ForeignKey(AssetCheckout, null=True, blank=True, on_delete=models.SET_NULL, related_name='events')
    related_maintenance = models.ForeignKey('maintenance.MaintenanceRequest', null=True, blank=True, on_delete=models.SET_NULL, related_name='events')
    related_transfer = models.ForeignKey(AssetTransfer, null=True, blank=True, on_delete=models.SET_NULL, related_name='events')

    # Actor information
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='asset_events')

    # Searchable description
    description = models.TextField()

    class Meta:
        ordering = ['-event_date']
        indexes = [
            models.Index(fields=['asset']),
            models.Index(fields=['event_type']),
            models.Index(fields=['event_date']),
            models.Index(fields=['actor']),
        ]

    def __str__(self):
        return f"{self.asset.asset_id} - {self.get_event_type_display()} - {self.event_date.strftime('%Y-%m-%d %H:%M')}"



class AssetDisposal(TimeStampedModel):
    """BR-AM-03: Asset disposal with committee review and property manager approval."""
    DISPOSAL_STATUS_CHOICES = [
        ('PENDING_MANAGER', 'Pending Property Manager Approval'),
        ('APPROVED', 'Fully Approved'),
        ('REJECTED', 'Rejected'),
        ('COMPLETED', 'Disposal Completed'),
    ]
    
    DISPOSAL_METHOD_CHOICES = [
        ('SALE', 'Sale'),
        ('DONATION', 'Donation'),
        ('SCRAP', 'Scrap'),
        ('DESTRUCTION', 'Destruction'),
        ('TRANSFER', 'Transfer to Another Institution'),
    ]
    
    DISPOSAL_CATEGORY_CHOICES = [
        ('END_OF_LIFE', 'End of Life'),
        ('OBSOLETE', 'Obsolete'),
        ('DAMAGED_BEYOND_REPAIR', 'Damaged Beyond Repair'),
        ('SURPLUS', 'Surplus'),
        ('UPGRADE', 'Upgrade'),
        ('OTHER', 'Other'),
    ]
    
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='disposal_requests')
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                     null=True, related_name='disposal_requests')
    request_date = models.DateTimeField(auto_now_add=True)
    
    reason = models.TextField(help_text="Reason for disposal")
    disposal_method = models.CharField(max_length=20, choices=DISPOSAL_METHOD_CHOICES)
    disposal_category = models.CharField(max_length=30, choices=DISPOSAL_CATEGORY_CHOICES, 
                                        blank=True, help_text="Category of disposal")
    estimated_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    planned_disposal_date = models.DateField(null=True, blank=True, 
                                            help_text="Planned date for disposal")
    environmental_impact = models.TextField(blank=True, 
                                           help_text="Environmental impact assessment")
    documentation = models.TextField(blank=True, 
                                    help_text="Additional documentation or notes")
    documentation_file = models.FileField(upload_to='assets/disposal_docs/', null=True, blank=True,
                                         help_text="Supporting documents for disposal")
    
    # Property manager approval
    property_manager = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                        null=True, blank=True, related_name='disposal_approvals')
    manager_approval_date = models.DateTimeField(null=True, blank=True)
    manager_notes = models.TextField(blank=True)
    
    # Status and completion
    status = models.CharField(max_length=30, choices=DISPOSAL_STATUS_CHOICES, default='PENDING_MANAGER')
    disposal_date = models.DateField(null=True, blank=True)
    disposal_receipt = models.FileField(upload_to='assets/disposal_receipts/', null=True, blank=True)
    final_notes = models.TextField(blank=True)
    
    # BR-DM-01: Data retention (10 years after disposal)
    retention_date = models.DateField(null=True, blank=True, help_text="Delete after this date (10 years)")
    marked_for_deletion = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-request_date']
        indexes = [
            models.Index(fields=['asset', 'status']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"Disposal Request for {self.asset.asset_id} - {self.status}"
    
    def can_manager_approve(self):
        """Check if property manager can approve."""
        return self.status == 'PENDING_MANAGER'
    
    def manager_approve(self, manager, notes=''):
        """Property manager approves disposal."""
        if not self.can_manager_approve():
            raise ValueError("Cannot approve at this stage")
        
        from django.utils import timezone
        from datetime import timedelta
        self.property_manager = manager
        self.manager_approval_date = timezone.now()
        self.manager_notes = notes
        self.status = 'APPROVED'
        
        # Update asset status
        self.asset.status = 'PENDING_DISPOSAL'
        self.asset.save()
        
        # BR-DM-01: Set retention date (10 years from disposal approval)
        if not self.retention_date:
            self.retention_date = (timezone.now() + timedelta(days=365*10)).date()
        
        self.save()
    
    def manager_reject(self, manager, notes=''):
        """Property manager rejects disposal."""
        if not self.can_manager_approve():
            raise ValueError("Cannot reject at this stage")
        
        from django.utils import timezone
        self.property_manager = manager
        self.manager_approval_date = timezone.now()
        self.manager_notes = notes
        self.status = 'REJECTED'
        self.save()


class AssetVerification(TimeStampedModel):
    """BR-AM-04: Annual physical verification with discrepancy reporting."""
    VERIFICATION_STATUS_CHOICES = [
        ('SCHEDULED', 'Scheduled'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('DISCREPANCY_FOUND', 'Discrepancy Found'),
        ('DISCREPANCY_RESOLVED', 'Discrepancy Resolved'),
    ]
    
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='verifications')
    verification_date = models.DateField()
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   null=True, related_name='asset_verifications')
    
    # Physical verification details
    physical_condition = models.CharField(max_length=20, choices=[
        ('EXCELLENT', 'Excellent'),
        ('GOOD', 'Good'),
        ('FAIR', 'Fair'),
        ('POOR', 'Poor'),
        ('MISSING', 'Missing'),
        ('DAMAGED', 'Damaged'),
    ])
    location_verified = models.BooleanField(default=True)
    actual_location = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True,
                                       related_name='verified_assets')
    
    # Discrepancy tracking
    has_discrepancy = models.BooleanField(default=False)
    discrepancy_type = models.CharField(max_length=50, choices=[
        ('LOCATION_MISMATCH', 'Location Mismatch'),
        ('CONDITION_MISMATCH', 'Condition Mismatch'),
        ('MISSING', 'Asset Missing'),
        ('UNAUTHORIZED_MODIFICATION', 'Unauthorized Modification'),
        ('OTHER', 'Other'),
    ], blank=True)
    discrepancy_description = models.TextField(blank=True)
    discrepancy_reported_date = models.DateTimeField(null=True, blank=True)
    
    # BR-AM-04: 14-day discrepancy reporting deadline
    discrepancy_report_deadline = models.DateField(null=True, blank=True)
    discrepancy_report_submitted = models.BooleanField(default=False)
    discrepancy_report_file = models.FileField(upload_to='assets/verification_reports/', 
                                              null=True, blank=True)
    
    # Resolution
    resolution_notes = models.TextField(blank=True)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   null=True, blank=True, related_name='resolved_verifications')
    resolved_date = models.DateTimeField(null=True, blank=True)
    
    status = models.CharField(max_length=30, choices=VERIFICATION_STATUS_CHOICES, default='SCHEDULED')
    notes = models.TextField(blank=True)
    
    # Verification Certificate
    verification_certificate = models.FileField(upload_to='assets/verification_certificates/', null=True, blank=True)
    
    class Meta:
        ordering = ['-verification_date']
        indexes = [
            models.Index(fields=['asset', 'verification_date']),
            models.Index(fields=['status']),
            models.Index(fields=['has_discrepancy']),
        ]
    
    def __str__(self):
        return f"Verification of {self.asset.asset_id} on {self.verification_date}"
    
    def save(self, *args, **kwargs):
        # Set discrepancy report deadline (14 days from verification)
        if self.has_discrepancy and not self.discrepancy_report_deadline:
            from datetime import timedelta
            self.discrepancy_report_deadline = self.verification_date + timedelta(days=14)
        
        super().save(*args, **kwargs)
    
    def is_discrepancy_report_overdue(self):
        """Check if discrepancy report is overdue."""
        if not self.has_discrepancy or self.discrepancy_report_submitted:
            return False
        
        from datetime import date
        return date.today() > self.discrepancy_report_deadline
    
    def days_until_report_deadline(self):
        """Days until discrepancy report deadline."""
        if not self.has_discrepancy or not self.discrepancy_report_deadline:
            return None
        
        from datetime import date
        delta = self.discrepancy_report_deadline - date.today()
        return delta.days


# Import extension models to ensure they're registered
from .extension_models import AssignmentExtensionRequest
