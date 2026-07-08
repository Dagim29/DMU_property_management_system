"""
Views for Asset Assignment Request System
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models
from django.db.models import Q, Count, Prefetch
from django.utils import timezone
from datetime import timedelta, date
from apps.core.permissions import IsPropertyManager
from apps.core.utils import log_action, get_client_ip
from apps.core.models import Notification
from .assignment_models import AssetAssignmentRequest, AssetWaitlist, AssignmentRequestHistory
from .assignment_serializers import (
    AssetAssignmentRequestSerializer,
    AssetAssignmentRequestListSerializer,
    AssetWaitlistSerializer,
    AssignmentRequestHistorySerializer,
    AssetAvailabilitySerializer
)
from .models import Asset
from .validators import ConditionDocumentationValidator


class AssetAssignmentRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Asset Assignment Requests.
    
    Users can:
    - Create requests
    - View their own requests
    - Cancel pending requests
    - Accept terms
    - Confirm receipt/return
    
    Property Managers can:
    - View all requests
    - Approve/reject requests
    - Add to waitlist
    - Complete handover/return
    """
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return AssetAssignmentRequestListSerializer
        return AssetAssignmentRequestSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = AssetAssignmentRequest.objects.select_related(
            'asset', 'requested_by', 'reviewed_by', 'waitlist_entry'
        ).prefetch_related(
            Prefetch('history', queryset=AssignmentRequestHistory.objects.select_related('performed_by'))
        )
        
        # Property Managers see all requests
        if user.role not in ['SUPER_ADMIN', 'PROPERTY_MANAGER']:
            queryset = queryset.filter(requested_by=user)
            
        # Apply query parameter filters
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
            
        priority_param = self.request.query_params.get('priority')
        if priority_param:
            queryset = queryset.filter(priority=priority_param)
            
        return queryset
    
    def perform_create(self, serializer):
        """Create new assignment request."""
        # Save with requested_by set to current user
        request = serializer.save(requested_by=self.request.user)
        
        # Notify Property Manager
        self._send_notification(
            user=None,  # Will send to all property managers
            notification_type='asset_assignment_request',
            title='New Asset Assignment Request',
            message=f'{request.requested_by.get_full_name()} requested {request.asset.name}',
            related_object_id=request.id
        )
        
        # Log action
        log_action(
            user=self.request.user,
            action='CREATE',
            model_name='AssetAssignmentRequest',
            object_id=request.id,
            details=f'Created assignment request {request.request_id} for {request.asset.asset_id}',
            ip_address=get_client_ip(self.request)
        )
    
    @action(detail=False, methods=['get'])
    def my_requests(self, request):
        """Get current user's requests."""
        queryset = self.get_queryset().filter(requested_by=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_active(self, request):
        """Get current user's active assignments."""
        queryset = self.get_queryset().filter(
            requested_by=request.user,
            status='ACTIVE'
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_history(self, request):
        """Get current user's past assignments."""
        queryset = self.get_queryset().filter(
            requested_by=request.user,
            status__in=['RETURNED', 'CANCELLED', 'EXPIRED']
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsPropertyManager])
    def pending(self, request):
        """Get all pending requests (Property Manager only)."""
        queryset = self.get_queryset().filter(status='PENDING_REVIEW').order_by('-priority', 'request_date')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsPropertyManager])
    def overdue(self, request):
        """Get all overdue assignments (Property Manager only)."""
        queryset = self.get_queryset().filter(is_overdue=True, status='ACTIVE')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsPropertyManager])
    def expiring_soon(self, request):
        """Get assignments ending in next 7 days (Property Manager only)."""
        today = date.today()
        week_from_now = today + timedelta(days=7)
        
        queryset = self.get_queryset().filter(
            status='ACTIVE',
            assignment_end_date__gte=today,
            assignment_end_date__lte=week_from_now
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a pending request."""
        assignment_request = self.get_object()
        
        # Check if user can cancel (it's a property, not a method)
        if not assignment_request.can_cancel:
            return Response(
                {'error': f'Cannot cancel request with status {assignment_request.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check ownership (unless property manager)
        if request.user != assignment_request.requested_by and request.user.role not in ['SUPER_ADMIN', 'PROPERTY_MANAGER']:
            return Response(
                {'error': 'You can only cancel your own requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        old_status = assignment_request.status
        assignment_request.status = 'CANCELLED'
        assignment_request.save()
        
        # Remove from waitlist if applicable
        if hasattr(assignment_request, 'waitlist_entry'):
            assignment_request.waitlist_entry.cancel()
            self._reorder_waitlist(assignment_request.asset)
        
        # Create history entry
        AssignmentRequestHistory.objects.create(
            request=assignment_request,
            action='CANCELLED',
            performed_by=request.user,
            old_status=old_status,
            new_status='CANCELLED',
            notes=request.data.get('reason', 'Request cancelled by user')
        )
        
        serializer = self.get_serializer(assignment_request)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsPropertyManager])
    def approve(self, request, pk=None):
        """Approve an assignment request (Property Manager only)."""
        assignment_request = self.get_object()
        
        if not assignment_request.can_approve:
            return Response(
                {'error': f'Cannot approve request with status {assignment_request.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check asset availability
        availability = self._check_asset_availability(assignment_request.asset)
        
        if not availability['is_available']:
            return Response(
                {'error': 'Asset is not available', 'availability': availability},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = assignment_request.status
        assignment_request.status = 'APPROVED'
        assignment_request.reviewed_by = request.user
        assignment_request.review_date = timezone.now()
        assignment_request.review_notes = request.data.get('notes', '')
        assignment_request.save()
        
        # Create history entry
        AssignmentRequestHistory.objects.create(
            request=assignment_request,
            action='APPROVED',
            performed_by=request.user,
            old_status=old_status,
            new_status='APPROVED',
            notes=assignment_request.review_notes
        )
        
        # Notify user
        self._send_notification(
            user=assignment_request.requested_by,
            notification_type='asset_assignment_approved',
            title='Asset Request Approved',
            message=f'Your request for {assignment_request.asset.name} has been approved',
            related_object_id=assignment_request.id
        )
        
        # Log action
        log_action(
            user=request.user,
            action='APPROVE',
            model_name='AssetAssignmentRequest',
            object_id=assignment_request.id,
            details=f'Approved request {assignment_request.request_id}',
            ip_address=get_client_ip(request)
        )
        
        serializer = self.get_serializer(assignment_request)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsPropertyManager])
    def reject(self, request, pk=None):
        """Reject an assignment request (Property Manager only)."""
        assignment_request = self.get_object()
        
        if not assignment_request.can_reject:
            return Response(
                {'error': f'Cannot reject request with status {assignment_request.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        rejection_reason = request.data.get('reason', '')
        if not rejection_reason:
            return Response(
                {'error': 'Rejection reason is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = assignment_request.status
        assignment_request.status = 'REJECTED'
        assignment_request.reviewed_by = request.user
        assignment_request.review_date = timezone.now()
        assignment_request.rejection_reason = rejection_reason
        assignment_request.save()
        
        # Remove from waitlist if applicable
        if hasattr(assignment_request, 'waitlist_entry'):
            assignment_request.waitlist_entry.cancel()
            self._reorder_waitlist(assignment_request.asset)
        
        # Create history entry
        AssignmentRequestHistory.objects.create(
            request=assignment_request,
            action='REJECTED',
            performed_by=request.user,
            old_status=old_status,
            new_status='REJECTED',
            notes=rejection_reason
        )
        
        # Notify user
        self._send_notification(
            user=assignment_request.requested_by,
            notification_type='asset_assignment_rejected',
            title='Asset Request Rejected',
            message=f'Your request for {assignment_request.asset.name} was rejected: {rejection_reason}',
            related_object_id=assignment_request.id
        )
        
        # Log action
        log_action(
            user=request.user,
            action='REJECT',
            model_name='AssetAssignmentRequest',
            object_id=assignment_request.id,
            details=f'Rejected request {assignment_request.request_id}: {rejection_reason}',
            ip_address=get_client_ip(request)
        )
        
        serializer = self.get_serializer(assignment_request)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsPropertyManager])
    def add_to_waitlist(self, request, pk=None):
        """Add request to waitlist (Property Manager only)."""
        assignment_request = self.get_object()
        
        if assignment_request.status not in ['PENDING_REVIEW', 'APPROVED']:
            return Response(
                {'error': f'Cannot waitlist request with status {assignment_request.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get next position in waitlist
        last_position = AssetWaitlist.objects.filter(
            asset=assignment_request.asset,
            status='WAITING'
        ).aggregate(models.Max('position'))['position__max'] or 0
        
        next_position = last_position + 1
        
        # Create waitlist entry
        waitlist_entry = AssetWaitlist.objects.create(
            asset=assignment_request.asset,
            user=assignment_request.requested_by,
            request=assignment_request,
            position=next_position
        )
        
        old_status = assignment_request.status
        assignment_request.status = 'WAITLISTED'
        assignment_request.waitlist_position = next_position
        assignment_request.waitlist_added_date = timezone.now()
        assignment_request.estimated_available_date = request.data.get('estimated_date')
        assignment_request.reviewed_by = request.user
        assignment_request.review_date = timezone.now()
        assignment_request.review_notes = request.data.get('notes', '')
        assignment_request.save()
        
        # Create history entry
        AssignmentRequestHistory.objects.create(
            request=assignment_request,
            action='WAITLISTED',
            performed_by=request.user,
            old_status=old_status,
            new_status='WAITLISTED',
            notes=f'Added to waitlist at position {next_position}'
        )
        
        # Notify user
        self._send_notification(
            user=assignment_request.requested_by,
            notification_type='asset_assignment_waitlisted',
            title='Added to Asset Waitlist',
            message=f'Your request for {assignment_request.asset.name} has been added to the waitlist (Position {next_position})',
            related_object_id=assignment_request.id
        )
        
        serializer = self.get_serializer(assignment_request)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def accept_terms(self, request, pk=None):
        """User accepts assignment terms."""
        assignment_request = self.get_object()
        
        if assignment_request.status != 'APPROVED':
            return Response(
                {'error': 'Can only accept terms for approved requests'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if request.user != assignment_request.requested_by:
            return Response(
                {'error': 'Only the requester can accept terms'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        assignment_request.terms_accepted = True
        assignment_request.terms_accepted_date = timezone.now()
        assignment_request.user_signature = request.data.get('signature', '')
        assignment_request.save()
        
        # Create history entry
        AssignmentRequestHistory.objects.create(
            request=assignment_request,
            action='TERMS_ACCEPTED',
            performed_by=request.user,
            notes='User accepted assignment terms'
        )
        
        serializer = self.get_serializer(assignment_request)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsPropertyManager])
    def complete_handover(self, request, pk=None):
        """Complete asset handover and activate assignment (Property Manager only)."""
        assignment_request = self.get_object()
        
        if not assignment_request.can_activate:
            return Response(
                {'error': 'Cannot activate this request. Ensure it is approved and terms are accepted.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get handover data
        condition = request.data.get('condition', 'GOOD')
        condition_notes = request.data.get('condition_notes', '')
        photos = request.data.get('photos', [])
        
        # Validate handover documentation
        try:
            ConditionDocumentationValidator.validate_handover_documentation(
                condition, condition_notes, photos
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse end_date if provided
        end_date = request.data.get('end_date', assignment_request.requested_end_date)
        if isinstance(end_date, str):
            from django.utils.dateparse import parse_date
            end_date = parse_date(end_date)
        
        # Update assignment
        old_status = assignment_request.status
        assignment_request.status = 'ACTIVE'
        assignment_request.assignment_start_date = timezone.now()
        assignment_request.assignment_end_date = end_date
        assignment_request.assignment_condition = condition
        assignment_request.assignment_condition_notes = condition_notes
        assignment_request.handover_photos = photos
        assignment_request.save()
        
        # Update asset
        asset = assignment_request.asset
        asset.assigned_to = assignment_request.requested_by
        asset.status = 'IN_USE'
        
        # Chain of custody: Update location if provided
        handover_room_id = request.data.get('handover_room_id')
        if handover_room_id:
            try:
                from apps.assets.models import Room
                room = Room.objects.get(id=handover_room_id)
                asset.room = room
                if hasattr(room, 'floor') and room.floor and room.floor.building:
                    asset.campus = room.floor.building.campus
            except Exception:
                pass
                
        asset.save()
        
        # Create history entry
        AssignmentRequestHistory.objects.create(
            request=assignment_request,
            action='ACTIVATED',
            performed_by=request.user,
            old_status=old_status,
            new_status='ACTIVE',
            notes='Asset handover completed'
        )
        
        # Notify user
        self._send_notification(
            user=assignment_request.requested_by,
            notification_type='asset_assignment_active',
            title='Asset Assignment Active',
            message=f'You have received {assignment_request.asset.name}. Please take good care of it.',
            related_object_id=assignment_request.id
        )
        
        # Log action
        log_action(
            user=request.user,
            action='ACTIVATE',
            model_name='AssetAssignmentRequest',
            object_id=assignment_request.id,
            details=f'Completed handover for {assignment_request.request_id}',
            ip_address=get_client_ip(request)
        )
        
        serializer = self.get_serializer(assignment_request)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def initiate_return(self, request, pk=None):
        """User initiates asset return with photos and notes."""
        assignment_request = self.get_object()
        
        if not assignment_request.can_return:
            return Response(
                {'error': 'Cannot return this asset'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if request.user != assignment_request.requested_by:
            return Response(
                {'error': 'Only the assigned user can initiate return'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        photos = request.data.get('photos', [])
        notes = request.data.get('notes', '')
        
        # Validate that requester has uploaded photos (min 2)
        photo_count = len(photos) if photos else 0
        if photo_count < 2:
            return Response(
                {'error': 'Minimum 2 return photos are required to initiate return.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if photo_count > 10:
            return Response(
                {'error': 'Maximum 10 return photos allowed.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        assignment_request.return_photos = photos
        assignment_request.return_condition_notes = notes
        assignment_request.save()
        
        # Notify property manager
        self._send_notification(
            user=None,  # Send to property managers
            notification_type='asset_return_initiated',
            title='Asset Return Initiated',
            message=f'{request.user.get_full_name()} wants to return {assignment_request.asset.name}',
            related_object_id=assignment_request.id
        )
        
        # Create history entry
        AssignmentRequestHistory.objects.create(
            request=assignment_request,
            action='RETURN_INITIATED',
            performed_by=request.user,
            notes='User initiated return and uploaded photos'
        )
        
        return Response({'message': 'Return initiated. Property Manager will contact you to schedule inspection.'})
    
    @action(detail=True, methods=['post'], permission_classes=[IsPropertyManager])
    def complete_return(self, request, pk=None):
        """Complete asset return (Property Manager only)."""
        assignment_request = self.get_object()
        
        if not assignment_request.can_return:
            return Response(
                {'error': 'Cannot complete return for this request'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get return data
        condition = request.data.get('condition', 'GOOD')
        condition_notes = request.data.get('condition_notes', '')
        
        # Use stored return photos uploaded by requester
        photos = assignment_request.return_photos
        
        # Validate return documentation using stored photos
        try:
            ConditionDocumentationValidator.validate_return_documentation(
                condition, 
                condition_notes, 
                photos,
                handover_condition=assignment_request.assignment_condition
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update assignment
        old_status = assignment_request.status
        assignment_request.status = 'RETURNED'
        assignment_request.actual_return_date = timezone.now()
        assignment_request.return_condition = condition
        assignment_request.return_condition_notes = (
            f"User Notes: {assignment_request.return_condition_notes}\nPM Review: {condition_notes}" 
            if assignment_request.return_condition_notes else condition_notes
        )
        assignment_request.save()
        
        # Update asset
        asset = assignment_request.asset
        asset.assigned_to = None
        asset.condition = condition
        
        # Enterprise Logic: Prevent damaged assets from being re-issued
        if condition in ['POOR', 'DAMAGED']:
            asset.status = 'UNDER_MAINTENANCE'
        else:
            asset.status = 'AVAILABLE'
            
        # Enterprise Logic: Update physical chain of custody
        return_room_id = request.data.get('return_room_id')
        if return_room_id:
            try:
                from apps.assets.models import Room
                room = Room.objects.get(id=return_room_id)
                asset.room = room
                if hasattr(room, 'floor') and room.floor and room.floor.building:
                    asset.campus = room.floor.building.campus
            except Exception:
                pass
                
        asset.save()
        
        # Create history entry
        AssignmentRequestHistory.objects.create(
            request=assignment_request,
            action='RETURNED',
            performed_by=request.user,
            old_status=old_status,
            new_status='RETURNED',
            notes='Asset return completed'
        )
        
        # Notify user
        self._send_notification(
            user=assignment_request.requested_by,
            notification_type='asset_return_completed',
            title='Asset Return Completed',
            message=f'Return of {assignment_request.asset.name} has been completed. Thank you!',
            related_object_id=assignment_request.id
        )
        
        # Process waitlist
        self._process_waitlist(asset)
        
        # Log action
        log_action(
            user=request.user,
            action='RETURN',
            model_name='AssetAssignmentRequest',
            object_id=assignment_request.id,
            details=f'Completed return for {assignment_request.request_id}',
            ip_address=get_client_ip(request)
        )
        
        serializer = self.get_serializer(assignment_request)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsPropertyManager])
    def statistics(self, request):
        """Get assignment request statistics (Property Manager only)."""
        from django.db import models
        
        total = AssetAssignmentRequest.objects.count()
        by_status = AssetAssignmentRequest.objects.values('status').annotate(count=Count('id'))
        pending = AssetAssignmentRequest.objects.filter(status='PENDING_REVIEW').count()
        active = AssetAssignmentRequest.objects.filter(status='ACTIVE').count()
        overdue = AssetAssignmentRequest.objects.filter(is_overdue=True).count()
        waitlisted = AssetAssignmentRequest.objects.filter(status='WAITLISTED').count()
        
        return Response({
            'total': total,
            'by_status': list(by_status),
            'pending': pending,
            'active': active,
            'overdue': overdue,
            'waitlisted': waitlisted
        })
    
    def _check_asset_availability(self, asset):
        """Check if asset is available for assignment."""
        is_available = asset.status == 'AVAILABLE' and not asset.assigned_to
        
        # Check for active assignments
        active_assignment = AssetAssignmentRequest.objects.filter(
            asset=asset,
            status='ACTIVE'
        ).first()
        
        # Check waitlist
        waitlist_count = AssetWaitlist.objects.filter(
            asset=asset,
            status='WAITING'
        ).count()
        
        availability_status = 'AVAILABLE'
        message = 'Asset is available for assignment'
        estimated_date = None
        
        if asset.status == 'UNDER_MAINTENANCE':
            availability_status = 'UNDER_MAINTENANCE'
            message = 'Asset is currently under maintenance'
            is_available = False
        elif asset.status == 'CONDEMNED':
            availability_status = 'CONDEMNED'
            message = 'Asset is condemned and cannot be assigned'
            is_available = False
        elif active_assignment:
            availability_status = 'IN_USE'
            message = 'Asset is currently assigned to another user'
            estimated_date = active_assignment.assignment_end_date
            is_available = False
        
        return {
            'asset_id': asset.asset_id,
            'asset_name': asset.name,
            'is_available': is_available,
            'availability_status': availability_status,
            'current_status': asset.status,
            'estimated_available_date': estimated_date,
            'waitlist_count': waitlist_count,
            'can_request': asset.status not in ['CONDEMNED', 'PENDING_DISPOSAL'],
            'message': message,
            'current_assignment': {
                'request_id': active_assignment.request_id,
                'user': active_assignment.requested_by.get_full_name(),
                'end_date': active_assignment.assignment_end_date
            } if active_assignment else None
        }
    
    def _process_waitlist(self, asset):
        """Process waitlist when asset becomes available."""
        next_in_queue = AssetWaitlist.objects.filter(
            asset=asset,
            status='WAITING'
        ).order_by('position').first()
        
        if next_in_queue:
            next_in_queue.notify_user()
            
            # Send notification
            self._send_notification(
                user=next_in_queue.user,
                notification_type='asset_available',
                title='Asset Now Available',
                message=f'{asset.name} is now available! You have 24 hours to respond.',
                related_object_id=next_in_queue.request.id
            )
    
    def _reorder_waitlist(self, asset):
        """Reorder waitlist positions after removal."""
        waitlist_entries = AssetWaitlist.objects.filter(
            asset=asset,
            status='WAITING'
        ).order_by('position')
        
        for index, entry in enumerate(waitlist_entries, start=1):
            if entry.position != index:
                entry.position = index
                entry.save()
                
                # Update request
                entry.request.waitlist_position = index
                entry.request.save()
    
    def _send_notification(self, user, notification_type, title, message, related_object_id=None):
        """Send notification to user or all property managers."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        if user:
            users = [user]
        else:
            # Send to all property managers
            users = User.objects.filter(role__in=['SUPER_ADMIN', 'PROPERTY_MANAGER'])
        
        for recipient in users:
            Notification.objects.create(
                user=recipient,
                notification_type=notification_type,
                title=title,
                message=message
            )


class AssetAvailabilityViewSet(viewsets.ViewSet):
    """ViewSet for checking asset availability."""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def check(self, request):
        """Check availability of a specific asset."""
        asset_id = request.query_params.get('asset_id')
        
        if not asset_id:
            return Response(
                {'error': 'asset_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            asset = Asset.objects.get(id=asset_id)
        except Asset.DoesNotExist:
            return Response(
                {'error': 'Asset not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Use the availability check method
        viewset = AssetAssignmentRequestViewSet()
        availability = viewset._check_asset_availability(asset)
        
        serializer = AssetAvailabilitySerializer(availability)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def available_assets(self, request):
        """Get list of available assets."""
        assets = Asset.objects.filter(
            status='AVAILABLE',
            assigned_to__isnull=True
        ).exclude(
            status__in=['CONDEMNED', 'PENDING_DISPOSAL']
        )
        
        # Apply filters
        asset_type = request.query_params.get('type')
        campus = request.query_params.get('campus')
        
        if asset_type:
            assets = assets.filter(asset_type=asset_type)
        if campus:
            assets = assets.filter(campus_id=campus)
        
        from .serializers import AssetSerializer
        serializer = AssetSerializer(assets, many=True)
        return Response(serializer.data)


class WaitlistViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for managing waitlists."""
    permission_classes = [IsAuthenticated]
    serializer_class = AssetWaitlistSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        # Property Managers see all waitlists
        if user.role in ['SUPER_ADMIN', 'PROPERTY_MANAGER']:
            return AssetWaitlist.objects.select_related('asset', 'user', 'request').all()
        
        # Regular users see only their own
        return AssetWaitlist.objects.filter(user=user).select_related('asset', 'request')
    
    @action(detail=False, methods=['get'])
    def my_waitlist(self, request):
        """Get current user's waitlist entries."""
        queryset = self.get_queryset().filter(user=request.user, status='WAITING')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsPropertyManager])
    def notify_next(self, request, pk=None):
        """Manually notify next user in waitlist (Property Manager only)."""
        waitlist_entry = self.get_object()
        
        if waitlist_entry.status != 'WAITING':
            return Response(
                {'error': 'Can only notify waiting entries'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        waitlist_entry.notify_user()
        
        # Send notification
        Notification.objects.create(
            user=waitlist_entry.user,
            notification_type='asset_available',
            title='Asset Now Available',
            message=f'{waitlist_entry.asset.name} is now available! You have 24 hours to respond.',
            related_object_id=waitlist_entry.request.id
        )
        
        serializer = self.get_serializer(waitlist_entry)
        return Response(serializer.data)
