"""
Views for Assignment Extension Requests
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from apps.core.permissions import IsPropertyManager
from apps.core.utils import log_action, get_client_ip
from apps.core.models import Notification
from .extension_models import AssignmentExtensionRequest
from .extension_serializers import AssignmentExtensionRequestSerializer
from .assignment_models import AssignmentRequestHistory


class AssignmentExtensionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Assignment Extension Requests.
    
    Users can:
    - Request extensions for their active assignments
    - View their extension requests
    - Cancel pending requests
    
    Property Managers can:
    - View all extension requests
    - Approve/reject requests
    """
    permission_classes = [IsAuthenticated]
    serializer_class = AssignmentExtensionRequestSerializer
    
    def get_queryset(self):
        user = self.request.user
        print(f"DEBUG: get_queryset for user {user.username}, role {user.role}")
        queryset = AssignmentExtensionRequest.objects.select_related(
            'assignment__asset',
            'assignment__requested_by',
            'requested_by',
            'reviewed_by'
        )
        
        # Property Managers see all
        if user.role in ['SUPER_ADMIN', 'PROPERTY_MANAGER']:
            print(f"DEBUG: returning all requests. Total Count: {queryset.count()}")
            return queryset.all()
        
        # Users see only their own
        print(f"DEBUG: returning filtered requests for user {user.username}. Count: {queryset.filter(requested_by=user).count()}")
        return queryset.filter(requested_by=user)
    
    def perform_create(self, serializer):
        """Create new extension request."""
        extension = serializer.save(requested_by=self.request.user)
        
        # Notify Property Managers
        from django.contrib.auth import get_user_model
        User = get_user_model()
        property_managers = User.objects.filter(role__in=['SUPER_ADMIN', 'PROPERTY_MANAGER'])
        
        for manager in property_managers:
            Notification.objects.create(
                user=manager,
                notification_type='extension_request',
                title='New Extension Request',
                message=f'{extension.requested_by.get_full_name()} requested {extension.extension_days}-day '
                       f'extension for {extension.assignment.asset.name}',
                related_object_type='AssignmentExtensionRequest',
                related_object_id=extension.id
            )
        
        # Log action
        log_action(
            user=self.request.user,
            action='CREATE',
            model_name='AssignmentExtensionRequest',
            object_id=extension.id,
            details=f'Requested {extension.extension_days}-day extension for {extension.assignment.request_id}',
            ip_address=get_client_ip(self.request)
        )
    
    @action(detail=False, methods=['get'])
    def my_requests(self, request):
        """Get current user's extension requests."""
        queryset = self.get_queryset().filter(requested_by=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsPropertyManager])
    def pending(self, request):
        """Get all pending extension requests (Property Manager only)."""
        queryset = self.get_queryset().filter(status='PENDING').order_by('request_date')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a pending extension request."""
        extension = self.get_object()
        
        if not extension.can_cancel:
            return Response(
                {'error': f'Cannot cancel extension with status {extension.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check ownership
        if request.user != extension.requested_by and request.user.role not in ['SUPER_ADMIN', 'PROPERTY_MANAGER']:
            return Response(
                {'error': 'You can only cancel your own requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        extension.status = 'CANCELLED'
        extension.save()
        
        serializer = self.get_serializer(extension)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsPropertyManager])
    def approve(self, request, pk=None):
        """Approve an extension request (Property Manager only)."""
        extension = self.get_object()
        
        if not extension.can_approve:
            return Response(
                {'error': f'Cannot approve extension with status {extension.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get approved end date (can be different from requested)
        approved_end_date = request.data.get('approved_end_date', extension.requested_new_end_date)
        if isinstance(approved_end_date, str):
            from django.utils.dateparse import parse_date
            approved_end_date = parse_date(approved_end_date)
        
        # Calculate approved days
        approved_days = (approved_end_date - extension.current_end_date).days
        
        # Update extension
        extension.status = 'APPROVED'
        extension.reviewed_by = request.user
        extension.review_date = timezone.now()
        extension.review_notes = request.data.get('notes', '')
        extension.approved_end_date = approved_end_date
        extension.approved_days = approved_days
        extension.save()
        
        # Update assignment end date
        assignment = extension.assignment
        old_end_date = assignment.assignment_end_date
        assignment.assignment_end_date = approved_end_date
        assignment.save()
        
        # Create history entry
        AssignmentRequestHistory.objects.create(
            request=assignment,
            action='ACTIVATED',  # Reusing action type
            performed_by=request.user,
            notes=f'Extension approved: {approved_days} days. '
                 f'New end date: {approved_end_date}. '
                 f'Old end date: {old_end_date}'
        )
        
        # Notify user
        Notification.objects.create(
            user=extension.requested_by,
            notification_type='extension_approved',
            title='✅ Extension Request Approved',
            message=f'Your extension request for {assignment.asset.name} has been approved. '
                   f'New end date: {approved_end_date.strftime("%B %d, %Y")} '
                   f'({approved_days} days extension).',
            related_object_type='AssetAssignmentRequest',
            related_object_id=assignment.id
        )
        
        # Log action
        log_action(
            user=request.user,
            action='APPROVE',
            model_name='AssignmentExtensionRequest',
            object_id=extension.id,
            details=f'Approved {approved_days}-day extension for {assignment.request_id}',
            ip_address=get_client_ip(request)
        )
        
        serializer = self.get_serializer(extension)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsPropertyManager])
    def reject(self, request, pk=None):
        """Reject an extension request (Property Manager only)."""
        extension = self.get_object()
        
        if not extension.can_reject:
            return Response(
                {'error': f'Cannot reject extension with status {extension.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        rejection_reason = request.data.get('reason', '')
        if not rejection_reason:
            return Response(
                {'error': 'Rejection reason is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update extension
        extension.status = 'REJECTED'
        extension.reviewed_by = request.user
        extension.review_date = timezone.now()
        extension.rejection_reason = rejection_reason
        extension.save()
        
        # Notify user
        Notification.objects.create(
            user=extension.requested_by,
            notification_type='extension_rejected',
            title='❌ Extension Request Rejected',
            message=f'Your extension request for {extension.assignment.asset.name} was rejected. '
                   f'Reason: {rejection_reason}. '
                   f'Please return the asset by the original due date: '
                   f'{extension.current_end_date.strftime("%B %d, %Y")}.',
            related_object_type='AssetAssignmentRequest',
            related_object_id=extension.assignment.id
        )
        
        # Log action
        log_action(
            user=request.user,
            action='REJECT',
            model_name='AssignmentExtensionRequest',
            object_id=extension.id,
            details=f'Rejected extension for {extension.assignment.request_id}: {rejection_reason}',
            ip_address=get_client_ip(request)
        )
        
        serializer = self.get_serializer(extension)
        return Response(serializer.data)
