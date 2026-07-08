"""Views for Inventory Management."""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Sum
from django.utils import timezone

from .inventory_models import InventoryItem, PartsRequest, PartsRequestItem, StockTransaction
from .inventory_serializers import (
    InventoryItemSerializer, PartsRequestSerializer, PartsRequestCreateSerializer,
    PartsRequestItemSerializer, StockTransactionSerializer
)
from .models import WorkOrder
from apps.core.models import Notification


class InventoryItemViewSet(viewsets.ModelViewSet):
    """ViewSet for inventory items."""
    permission_classes = [IsAuthenticated]
    serializer_class = InventoryItemSerializer
    queryset = InventoryItem.objects.all()
    
    def get_queryset(self):
        """Filter inventory items."""
        queryset = super().get_queryset()
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        # Filter by stock status
        stock_status = self.request.query_params.get('stock_status')
        if stock_status == 'LOW_STOCK':
            queryset = queryset.filter(quantity_in_stock__lte=models.F('minimum_stock_level'))
        elif stock_status == 'OUT_OF_STOCK':
            queryset = queryset.filter(quantity_in_stock=0)
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(item_code__icontains=search) |
                Q(description__icontains=search)
            )
        
        return queryset.filter(is_active=True).order_by('name')
    
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get items with low stock."""
        items = self.get_queryset().filter(
            quantity_in_stock__lte=models.F('minimum_stock_level')
        )
        serializer = self.get_serializer(items, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Get all categories with counts."""
        from django.db.models import Count
        categories = InventoryItem.objects.values('category').annotate(
            count=Count('id')
        ).order_by('category')
        return Response(categories)


class PartsRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for parts requests."""
    permission_classes = [IsAuthenticated]
    serializer_class = PartsRequestSerializer
    
    def get_queryset(self):
        """Get parts requests based on user role."""
        user = self.request.user
        queryset = PartsRequest.objects.select_related(
            'requested_by', 'reviewed_by', 'fulfilled_by', 'work_order'
        ).prefetch_related('items__inventory_item')
        
        # Technicians see their own requests
        if user.role == 'MAINTENANCE_TECHNICIAN':
            queryset = queryset.filter(requested_by=user)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.order_by('-created_at')
    
    def create(self, request):
        """Create a new parts request."""
        serializer = PartsRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        # Get work order if provided
        work_order = None
        if data.get('work_order'):
            try:
                work_order = WorkOrder.objects.get(id=data['work_order'])
            except WorkOrder.DoesNotExist:
                return Response(
                    {'error': 'Work order not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Create parts request
        parts_request = PartsRequest.objects.create(
            work_order=work_order,
            requested_by=request.user,
            priority=data['priority'],
            reason=data['reason'],
            notes=data.get('notes', '')
        )
        
        # Create request items
        for item_data in data['items']:
            try:
                inventory_item = InventoryItem.objects.get(id=item_data['inventory_item'])
                PartsRequestItem.objects.create(
                    parts_request=parts_request,
                    inventory_item=inventory_item,
                    quantity_requested=item_data['quantity'],
                    notes=item_data.get('notes', '')
                )
            except InventoryItem.DoesNotExist:
                parts_request.delete()
                return Response(
                    {'error': f"Inventory item {item_data['inventory_item']} not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Notify supervisors/managers
        from apps.users.models import User
        managers = User.objects.filter(role__in=['PROPERTY_MANAGER', 'SUPERVISOR'])
        for manager in managers:
            Notification.objects.create(
                user=manager,
                notification_type='system',
                title='New Parts Request',
                message=f'{request.user.get_full_name()} submitted a parts request: {data["reason"][:100]}',
                link=f'/dashboard/maintenance/parts-requests/{parts_request.id}'
            )
        
        return Response(
            PartsRequestSerializer(parts_request).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a parts request."""
        parts_request = self.get_object()
        
        if parts_request.status != 'PENDING':
            return Response(
                {'error': 'Only pending requests can be approved'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update approved quantities
        items_data = request.data.get('items', [])
        for item_data in items_data:
            try:
                item = parts_request.items.get(id=item_data['id'])
                item.quantity_approved = item_data.get('quantity_approved', item.quantity_requested)
                item.save()
            except PartsRequestItem.DoesNotExist:
                pass
        
        parts_request.status = 'APPROVED'
        parts_request.reviewed_by = request.user
        parts_request.reviewed_at = timezone.now()
        parts_request.review_notes = request.data.get('review_notes', '')
        parts_request.save()
        
        # Notify requester
        Notification.objects.create(
            user=parts_request.requested_by,
            notification_type='system',
            title='Parts Request Approved',
            message=f'Your parts request {parts_request.request_number} has been approved',
            link=f'/dashboard/technician/parts-requests/{parts_request.id}'
        )
        
        return Response(PartsRequestSerializer(parts_request).data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a parts request."""
        parts_request = self.get_object()
        
        if parts_request.status != 'PENDING':
            return Response(
                {'error': 'Only pending requests can be rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        parts_request.status = 'REJECTED'
        parts_request.reviewed_by = request.user
        parts_request.reviewed_at = timezone.now()
        parts_request.review_notes = request.data.get('review_notes', '')
        parts_request.save()
        
        # Notify requester
        Notification.objects.create(
            user=parts_request.requested_by,
            notification_type='system',
            title='Parts Request Rejected',
            message=f'Your parts request {parts_request.request_number} has been rejected',
            link=f'/dashboard/technician/parts-requests/{parts_request.id}'
        )
        
        return Response(PartsRequestSerializer(parts_request).data)
    
    @action(detail=True, methods=['post'])
    def fulfill(self, request, pk=None):
        """Fulfill a parts request."""
        parts_request = self.get_object()
        
        if parts_request.status != 'APPROVED':
            return Response(
                {'error': 'Only approved requests can be fulfilled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update fulfilled quantities and create stock transactions
        for item in parts_request.items.all():
            quantity = item.quantity_approved
            inventory_item = item.inventory_item
            
            # Check stock availability
            if inventory_item.quantity_in_stock < quantity:
                return Response(
                    {'error': f'Insufficient stock for {inventory_item.name}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create stock transaction
            stock_before = inventory_item.quantity_in_stock
            inventory_item.quantity_in_stock -= quantity
            inventory_item.save()
            
            StockTransaction.objects.create(
                inventory_item=inventory_item,
                transaction_type='OUT',
                quantity=quantity,
                reference_type='PartsRequest',
                reference_id=parts_request.id,
                performed_by=request.user,
                notes=f'Fulfilled parts request {parts_request.request_number}',
                stock_before=stock_before,
                stock_after=inventory_item.quantity_in_stock
            )
            
            item.quantity_fulfilled = quantity
            item.save()
        
        parts_request.status = 'FULFILLED'
        parts_request.fulfilled_by = request.user
        parts_request.fulfilled_at = timezone.now()
        parts_request.save()
        
        # Notify requester
        Notification.objects.create(
            user=parts_request.requested_by,
            notification_type='system',
            title='Parts Request Fulfilled',
            message=f'Your parts request {parts_request.request_number} has been fulfilled',
            link=f'/dashboard/technician/parts-requests/{parts_request.id}'
        )
        
        return Response(PartsRequestSerializer(parts_request).data)


class StockTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for stock transactions (read-only)."""
    permission_classes = [IsAuthenticated]
    serializer_class = StockTransactionSerializer
    queryset = StockTransaction.objects.select_related(
        'inventory_item', 'performed_by'
    ).order_by('-created_at')
    
    def get_queryset(self):
        """Filter transactions."""
        queryset = super().get_queryset()
        
        # Filter by inventory item
        item_id = self.request.query_params.get('inventory_item')
        if item_id:
            queryset = queryset.filter(inventory_item_id=item_id)
        
        # Filter by transaction type
        transaction_type = self.request.query_params.get('transaction_type')
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)
        
        return queryset
