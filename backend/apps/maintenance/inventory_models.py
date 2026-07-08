"""Inventory and Parts Management Models."""
from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel


class InventoryItem(TimeStampedModel):
    """Parts and supplies inventory."""
    CATEGORY_CHOICES = [
        ('ELECTRICAL', 'Electrical'),
        ('PLUMBING', 'Plumbing'),
        ('HVAC', 'HVAC'),
        ('MECHANICAL', 'Mechanical'),
        ('HARDWARE', 'Hardware'),
        ('TOOLS', 'Tools'),
        ('CONSUMABLES', 'Consumables'),
        ('OTHER', 'Other'),
    ]
    
    UNIT_CHOICES = [
        ('PIECE', 'Piece'),
        ('BOX', 'Box'),
        ('METER', 'Meter'),
        ('LITER', 'Liter'),
        ('KILOGRAM', 'Kilogram'),
        ('SET', 'Set'),
    ]
    
    item_code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='PIECE')
    
    # Stock management
    quantity_in_stock = models.IntegerField(default=0)
    minimum_stock_level = models.IntegerField(default=10)
    reorder_quantity = models.IntegerField(default=50)
    
    # Pricing
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Location
    storage_location = models.CharField(max_length=100, blank=True)
    
    # Supplier info
    supplier_name = models.CharField(max_length=200, blank=True)
    supplier_contact = models.CharField(max_length=100, blank=True)
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['item_code']),
        ]
    
    def __str__(self):
        return f"{self.item_code} - {self.name}"
    
    @property
    def is_low_stock(self):
        """Check if item is below minimum stock level."""
        return self.quantity_in_stock <= self.minimum_stock_level
    
    @property
    def stock_status(self):
        """Get stock status."""
        if self.quantity_in_stock == 0:
            return 'OUT_OF_STOCK'
        elif self.is_low_stock:
            return 'LOW_STOCK'
        return 'IN_STOCK'


class PartsRequest(TimeStampedModel):
    """Parts request from technicians."""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('FULFILLED', 'Fulfilled'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    PRIORITY_CHOICES = [
        ('URGENT', 'Urgent'),
        ('HIGH', 'High'),
        ('NORMAL', 'Normal'),
        ('LOW', 'Low'),
    ]
    
    request_number = models.CharField(max_length=50, unique=True)
    work_order = models.ForeignKey(
        'WorkOrder',
        on_delete=models.CASCADE,
        related_name='parts_requests',
        null=True,
        blank=True
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='parts_requests'
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='NORMAL')
    
    reason = models.TextField(help_text="Reason for parts request")
    notes = models.TextField(blank=True)
    
    # Approval
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_parts_requests'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    
    # Fulfillment
    fulfilled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fulfilled_parts_requests'
    )
    fulfilled_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['requested_by', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.request_number} - {self.requested_by.get_full_name()}"
    
    def save(self, *args, **kwargs):
        if not self.request_number:
            # Generate request number
            from django.utils import timezone
            timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
            self.request_number = f"PR-{timestamp}"
        super().save(*args, **kwargs)


class PartsRequestItem(models.Model):
    """Individual items in a parts request."""
    parts_request = models.ForeignKey(
        PartsRequest,
        on_delete=models.CASCADE,
        related_name='items'
    )
    inventory_item = models.ForeignKey(
        InventoryItem,
        on_delete=models.CASCADE,
        related_name='request_items'
    )
    quantity_requested = models.IntegerField()
    quantity_approved = models.IntegerField(default=0)
    quantity_fulfilled = models.IntegerField(default=0)
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['id']
    
    def __str__(self):
        return f"{self.inventory_item.name} x {self.quantity_requested}"


class StockTransaction(TimeStampedModel):
    """Track all stock movements."""
    TRANSACTION_TYPES = [
        ('IN', 'Stock In'),
        ('OUT', 'Stock Out'),
        ('ADJUSTMENT', 'Adjustment'),
        ('RETURN', 'Return'),
    ]
    
    inventory_item = models.ForeignKey(
        InventoryItem,
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    quantity = models.IntegerField()
    
    # Reference
    reference_type = models.CharField(max_length=50, blank=True)  # e.g., 'PartsRequest', 'WorkOrder'
    reference_id = models.IntegerField(null=True, blank=True)
    
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    notes = models.TextField(blank=True)
    
    # Stock levels after transaction
    stock_before = models.IntegerField()
    stock_after = models.IntegerField()
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['inventory_item', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.transaction_type} - {self.inventory_item.name} x {self.quantity}"
