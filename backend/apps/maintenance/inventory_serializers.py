"""Serializers for Inventory Management."""
from rest_framework import serializers
from .inventory_models import InventoryItem, PartsRequest, PartsRequestItem, StockTransaction
from django.contrib.auth import get_user_model

User = get_user_model()


class InventoryItemSerializer(serializers.ModelSerializer):
    """Serializer for inventory items."""
    stock_status = serializers.CharField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    unit_display = serializers.CharField(source='get_unit_display', read_only=True)
    
    class Meta:
        model = InventoryItem
        fields = [
            'id', 'item_code', 'name', 'description', 'category', 'category_display',
            'unit', 'unit_display', 'quantity_in_stock', 'minimum_stock_level',
            'reorder_quantity', 'unit_cost', 'storage_location', 'supplier_name',
            'supplier_contact', 'is_active', 'stock_status', 'is_low_stock',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PartsRequestItemSerializer(serializers.ModelSerializer):
    """Serializer for parts request items."""
    inventory_item_details = InventoryItemSerializer(source='inventory_item', read_only=True)
    item_name = serializers.CharField(source='inventory_item.name', read_only=True)
    item_code = serializers.CharField(source='inventory_item.item_code', read_only=True)
    unit = serializers.CharField(source='inventory_item.unit_display', read_only=True)
    
    class Meta:
        model = PartsRequestItem
        fields = [
            'id', 'inventory_item', 'inventory_item_details', 'item_name', 'item_code',
            'unit', 'quantity_requested', 'quantity_approved', 'quantity_fulfilled', 'notes'
        ]


class PartsRequestSerializer(serializers.ModelSerializer):
    """Serializer for parts requests."""
    items = PartsRequestItemSerializer(many=True, read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True, allow_null=True)
    fulfilled_by_name = serializers.CharField(source='fulfilled_by.get_full_name', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    work_order_id = serializers.IntegerField(source='work_order.id', read_only=True, allow_null=True)
    
    class Meta:
        model = PartsRequest
        fields = [
            'id', 'request_number', 'work_order', 'work_order_id', 'requested_by',
            'requested_by_name', 'status', 'status_display', 'priority', 'priority_display',
            'reason', 'notes', 'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'review_notes', 'fulfilled_by', 'fulfilled_by_name', 'fulfilled_at',
            'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'request_number', 'requested_by', 'created_at', 'updated_at']


class PartsRequestCreateSerializer(serializers.Serializer):
    """Serializer for creating parts requests."""
    work_order = serializers.IntegerField(required=False, allow_null=True)
    priority = serializers.ChoiceField(choices=PartsRequest.PRIORITY_CHOICES, default='NORMAL')
    reason = serializers.CharField()
    notes = serializers.CharField(required=False, allow_blank=True)
    items = serializers.ListField(
        child=serializers.DictField(
            child=serializers.IntegerField()
        )
    )
    
    def validate_items(self, value):
        """Validate items list."""
        if not value:
            raise serializers.ValidationError("At least one item is required")
        
        for item in value:
            if 'inventory_item' not in item or 'quantity' not in item:
                raise serializers.ValidationError("Each item must have inventory_item and quantity")
            
            if item['quantity'] <= 0:
                raise serializers.ValidationError("Quantity must be greater than 0")
        
        return value


class StockTransactionSerializer(serializers.ModelSerializer):
    """Serializer for stock transactions."""
    inventory_item_name = serializers.CharField(source='inventory_item.name', read_only=True)
    inventory_item_code = serializers.CharField(source='inventory_item.item_code', read_only=True)
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True, allow_null=True)
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    
    class Meta:
        model = StockTransaction
        fields = [
            'id', 'inventory_item', 'inventory_item_name', 'inventory_item_code',
            'transaction_type', 'transaction_type_display', 'quantity', 'reference_type',
            'reference_id', 'performed_by', 'performed_by_name', 'notes', 'stock_before',
            'stock_after', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
