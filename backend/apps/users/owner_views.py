"""Views for Owner Portal - Staff and Students."""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count, Prefetch
from django.utils import timezone
from datetime import timedelta

from apps.assets.models import Asset, AssetCheckout, AssetEvent
from apps.maintenance.models import MaintenanceRequest, WorkOrder
from apps.core.models import Notification
from apps.assets.serializers import AssetSerializer, AssetCheckoutSerializer, AssetEventSerializer
from apps.maintenance.serializers import MaintenanceRequestSerializer


class OwnerDashboardViewSet(viewsets.ViewSet):
    """Dashboard data for asset owners."""
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """Get owner dashboard statistics."""
        user = request.user
        
        # Get assigned assets
        assigned_assets = Asset.objects.filter(assigned_to=user)
        
        # Get checked out assets
        active_checkouts = AssetCheckout.objects.filter(
            checked_out_to=user,
            is_returned=False
        )
        
        # Get maintenance requests
        my_requests = MaintenanceRequest.objects.filter(requested_by=user)
        
        # Get asset assignment requests
        from apps.assets.assignment_models import AssetAssignmentRequest
        my_asset_requests = AssetAssignmentRequest.objects.filter(requested_by=user)
        
        # Calculate statistics
        stats = {
            'assigned_assets': {
                'total': assigned_assets.count(),
                'by_status': {
                    'available': assigned_assets.filter(status='AVAILABLE').count(),
                    'in_use': assigned_assets.filter(status='IN_USE').count(),
                    'under_maintenance': assigned_assets.filter(status='UNDER_MAINTENANCE').count(),
                },
                'by_type': list(assigned_assets.values('asset_type').annotate(count=Count('id')))
            },
            'checkouts': {
                'active': active_checkouts.count(),
                'overdue': sum(1 for c in active_checkouts if c.is_overdue()),
                'total_history': AssetCheckout.objects.filter(checked_out_to=user).count()
            },
            'maintenance_requests': {
                'total': my_requests.count(),
                'pending': my_requests.filter(status__in=['SUBMITTED', 'ASSIGNED']).count(),
                'in_progress': my_requests.filter(status='IN_PROGRESS').count(),
                'completed': my_requests.filter(status='COMPLETED').count(),
                'by_priority': list(my_requests.values('priority').annotate(count=Count('id')))
            },
            'asset_requests': {
                'total': my_asset_requests.count(),
                'pending': my_asset_requests.filter(status='PENDING_REVIEW').count(),
                'approved': my_asset_requests.filter(status='APPROVED').count(),
                'active': my_asset_requests.filter(status='ACTIVE').count(),
                'waitlisted': my_asset_requests.filter(status='WAITLISTED').count(),
                'rejected': my_asset_requests.filter(status='REJECTED').count(),
            },
            'recent_activity': {
                'new_requests_7days': my_requests.filter(
                    created_at__gte=timezone.now() - timedelta(days=7)
                ).count(),
                'completed_requests_30days': my_requests.filter(
                    status='COMPLETED',
                    updated_at__gte=timezone.now() - timedelta(days=30)
                ).count()
            }
        }
        
        # Get recent notifications
        notifications = Notification.objects.filter(
            user=user
        ).order_by('-created_at')[:5]
        
        # Get overdue checkouts details
        overdue_checkouts = [
            {
                'id': checkout.id,
                'asset': {
                    'id': checkout.asset.id,
                    'asset_id': checkout.asset.asset_id,
                    'name': checkout.asset.name
                },
                'expected_return_date': checkout.expected_return_date,
                'days_overdue': (timezone.now().date() - checkout.expected_return_date).days
            }
            for checkout in active_checkouts if checkout.is_overdue()
        ]
        
        # Get pending maintenance requests
        pending_requests = my_requests.filter(
            status__in=['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS']
        ).order_by('-priority', '-created_at')[:5]
        
        return Response({
            'statistics': stats,
            'notifications': [
                {
                    'id': n.id,
                    'title': n.title,
                    'message': n.message,
                    'type': n.notification_type,
                    'is_read': n.read,
                    'created_at': n.created_at
                }
                for n in notifications
            ],
            'overdue_checkouts': overdue_checkouts,
            'pending_requests': MaintenanceRequestSerializer(pending_requests, many=True).data
        })


class MyAssetsViewSet(viewsets.ReadOnlyModelViewSet):
    """View assets assigned to the current user."""
    permission_classes = [IsAuthenticated]
    serializer_class = AssetSerializer
    
    def get_queryset(self):
        """Get assets assigned to current user."""
        return Asset.objects.filter(
            assigned_to=self.request.user
        ).select_related(
            'campus', 'room__floor__building'
        ).prefetch_related(
            'maintenance_requests', 'checkouts', 'warranty', 'insurance_policies'
        ).order_by('-created_at')
    
    @action(detail=True, methods=['get'])
    def maintenance_history(self, request, pk=None):
        """Get maintenance history for an asset."""
        asset = self.get_object()
        requests = MaintenanceRequest.objects.filter(
            asset=asset
        ).select_related('assigned_to', 'requested_by').order_by('-created_at')
        
        return Response(MaintenanceRequestSerializer(requests, many=True).data)
    
    @action(detail=True, methods=['get'])
    def checkout_history(self, request, pk=None):
        """Get checkout history for an asset."""
        asset = self.get_object()
        checkouts = AssetCheckout.objects.filter(
            asset=asset
        ).select_related('checked_out_to', 'checked_out_by').order_by('-checkout_date')
        
        return Response(AssetCheckoutSerializer(checkouts, many=True).data)


class MyCheckoutsViewSet(viewsets.ReadOnlyModelViewSet):
    """View checkouts for the current user."""
    permission_classes = [IsAuthenticated]
    serializer_class = AssetCheckoutSerializer
    
    def get_queryset(self):
        """Get checkouts for current user."""
        queryset = AssetCheckout.objects.filter(
            checked_out_to=self.request.user
        ).select_related(
            'asset__campus', 'checked_out_by'
        ).order_by('-checkout_date')
        
        # Filter by status
        status_filter = self.request.query_params.get('status', None)
        if status_filter == 'active':
            queryset = queryset.filter(is_returned=False)
        elif status_filter == 'returned':
            queryset = queryset.filter(is_returned=True)
        elif status_filter == 'overdue':
            queryset = queryset.filter(
                is_returned=False,
                expected_return_date__lt=timezone.now().date()
            )
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def request_extension(self, request, pk=None):
        """Request extension for checkout period."""
        from apps.assets.models import CheckoutExtensionRequest
        from datetime import datetime
        
        checkout = self.get_object()
        
        if checkout.is_returned:
            return Response(
                {'error': 'Cannot extend returned checkout'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        new_date_str = request.data.get('new_return_date')
        reason = request.data.get('reason', '')
        
        if not new_date_str:
            return Response(
                {'error': 'New return date is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not reason:
            return Response(
                {'error': 'Reason is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse date
        try:
            new_date = datetime.strptime(new_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate new date is after current expected return date
        if new_date <= checkout.expected_return_date:
            return Response(
                {'error': 'New return date must be after current expected return date'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create extension request record
        extension_request = CheckoutExtensionRequest.objects.create(
            checkout=checkout,
            requested_by=request.user,
            current_return_date=checkout.expected_return_date,
            requested_return_date=new_date,
            reason=reason
        )
        
        # Create notification for property manager who approved the checkout
        if checkout.checked_out_by:
            Notification.objects.create(
                user=checkout.checked_out_by,
                title='Checkout Extension Request',
                message=f'{request.user.get_full_name()} requested extension for {checkout.asset.asset_id} from {checkout.expected_return_date} to {new_date}. Reason: {reason}',
                notification_type='INFO'
            )
        
        # Also notify all property managers
        from apps.users.models import User
        managers = User.objects.filter(role='PROPERTY_MANAGER').exclude(id=checkout.checked_out_by.id if checkout.checked_out_by else None)
        for manager in managers:
            Notification.objects.create(
                user=manager,
                title='Checkout Extension Request',
                message=f'{request.user.get_full_name()} requested extension for {checkout.asset.asset_id}',
                notification_type='INFO'
            )
        
        return Response({
            'message': 'Extension request submitted successfully',
            'extension_request_id': extension_request.id,
            'checkout_id': checkout.id,
            'status': 'PENDING'
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def initiate_return(self, request, pk=None):
        """
        Owner initiates asset return/check-in process.
        Property Manager will need to inspect and complete the return.
        
        POST /api/owner/my-checkouts/{id}/initiate_return/
        Body: {
            return_condition: EXCELLENT|GOOD|FAIR|POOR|DAMAGED (optional),
            notes: string (optional)
        }
        """
        checkout = self.get_object()
        
        # Validate checkout can be returned
        if checkout.is_returned:
            return Response(
                {'error': 'This checkout has already been returned'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate user is the one who checked out the asset
        if checkout.checked_out_to != request.user:
            return Response(
                {'error': 'You can only return your own checkouts'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get return details from request
        return_condition = request.data.get('return_condition', 'GOOD')
        notes = request.data.get('notes', '')
        
        # Validate condition
        valid_conditions = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']
        if return_condition not in valid_conditions:
            return Response(
                {'error': f'Invalid condition. Must be one of: {", ".join(valid_conditions)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Mark checkout with return intent (we'll add a field or use notes)
        # For now, we'll create a notification for property managers
        from apps.users.models import User
        
        # Notify property managers
        managers = User.objects.filter(role__in=['PROPERTY_MANAGER', 'SUPER_ADMIN'])
        for manager in managers:
            Notification.objects.create(
                user=manager,
                title='Asset Return Initiated',
                message=f'{request.user.get_full_name()} wants to return {checkout.asset.asset_id}. Reported condition: {return_condition}. Please schedule inspection.',
                notification_type='INFO',
                related_model='AssetCheckout',
                related_id=checkout.id,
                link=f'/dashboard/pending-returns/{checkout.id}'
            )
        
        # Also notify the person who checked it out (if different)
        if checkout.checked_out_by and checkout.checked_out_by != request.user:
            Notification.objects.create(
                user=checkout.checked_out_by,
                title='Asset Return Initiated',
                message=f'{request.user.get_full_name()} initiated return for {checkout.asset.asset_id}',
                notification_type='INFO'
            )
        
        # Create an asset event for tracking
        AssetEvent.objects.create(
            asset=checkout.asset,
            event_type='RETURN_INITIATED',
            description=f'Return initiated by {request.user.get_full_name()}. Reported condition: {return_condition}',
            actor=request.user,
            related_checkout=checkout,
            event_data={
                'reported_condition': return_condition,
                'notes': notes,
                'checkout_id': checkout.id,
                'expected_return_date': str(checkout.expected_return_date),
                'is_overdue': checkout.is_overdue()
            }
        )
        
        return Response({
            'message': 'Return initiated successfully. A Property Manager will contact you to schedule inspection and complete the return.',
            'checkout_id': checkout.id,
            'asset_id': checkout.asset.asset_id,
            'reported_condition': return_condition,
            'status': 'RETURN_PENDING',
            'next_steps': 'Wait for Property Manager to contact you for inspection'
        }, status=status.HTTP_200_OK)


class MyMaintenanceRequestsViewSet(viewsets.ModelViewSet):
    """Maintenance requests submitted by the current user."""
    permission_classes = [IsAuthenticated]
    serializer_class = MaintenanceRequestSerializer
    
    def get_queryset(self):
        """Get maintenance requests for current user."""
        queryset = MaintenanceRequest.objects.filter(
            requested_by=self.request.user
        ).select_related(
            'asset__campus', 'assigned_to', 'service_rating', 'service_rating__rated_by'
        ).prefetch_related(
            Prefetch('work_order', queryset=WorkOrder.objects.select_related('assigned_to'))
        ).order_by('-created_at')
        
        # Filter by status
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by priority
        priority_filter = self.request.query_params.get('priority', None)
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)
        
        return queryset
    
    def perform_create(self, serializer):
        """Create maintenance request."""
        serializer.save(requested_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a maintenance request."""
        maintenance_request = self.get_object()
        
        if maintenance_request.status in ['COMPLETED', 'CANCELLED']:
            return Response(
                {'error': 'Cannot cancel completed or already cancelled request'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reason = request.data.get('reason', '')
        maintenance_request.status = 'CANCELLED'
        maintenance_request.save()
        
        # Notify assigned technician if any
        if maintenance_request.assigned_to:
            Notification.objects.create(
                user=maintenance_request.assigned_to,
                title='Maintenance Request Cancelled',
                message=f'Request {maintenance_request.request_id} has been cancelled. Reason: {reason}',
                notification_type='WARNING'
            )
        
        return Response({
            'message': 'Request cancelled successfully',
            'request_id': maintenance_request.request_id
        })
    
    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        """Add comment to maintenance request."""
        maintenance_request = self.get_object()
        comment = request.data.get('comment', '')
        
        if not comment:
            return Response(
                {'error': 'Comment is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Notify assigned technician
        if maintenance_request.assigned_to:
            Notification.objects.create(
                user=maintenance_request.assigned_to,
                title='New Comment on Request',
                message=f'{request.user.get_full_name()} commented on {maintenance_request.request_id}: {comment}',
                notification_type='INFO'
            )
        
        return Response({
            'message': 'Comment added successfully'
        })

    @action(detail=True, methods=['post'])
    def signoff(self, request, pk=None):
        """
        Owner/requester sign-off on a completed work order.
        POST /api/owner/my-requests/{id}/signoff/
        """
        from apps.maintenance.models import WorkOrder
        from django.utils import timezone as tz

        maintenance_request = self.get_object()

        if maintenance_request.status != 'COMPLETED':
            return Response(
                {'error': 'Can only sign off on completed requests'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            work_order = maintenance_request.work_order
        except WorkOrder.DoesNotExist:
            return Response(
                {'error': 'No work order found for this request'},
                status=status.HTTP_404_NOT_FOUND
            )

        if work_order.requester_signed_off:
            return Response(
                {'error': 'Already signed off'},
                status=status.HTTP_400_BAD_REQUEST
            )

        work_order.requester_signed_off = True
        work_order.requester_signoff_by = request.user
        work_order.requester_signoff_date = tz.now()

        # Check if both parties have signed off
        if work_order.supervisor_signed_off:
            work_order.fully_approved = True

        work_order.save()

        # Notify supervisor
        from apps.users.models import User
        supervisors = User.objects.filter(role='MAINTENANCE_SUPERVISOR', is_active=True)
        for sup in supervisors:
            Notification.objects.create(
                user=sup,
                title='Work Order Sign-Off',
                message=f'{request.user.get_full_name()} has signed off on {maintenance_request.request_id}',
                notification_type='SUCCESS'
            )

        return Response({
            'message': 'Sign-off completed successfully',
            'requester_signed_off': True,
            'fully_approved': work_order.fully_approved,
            'signoff_date': work_order.requester_signoff_date.isoformat(),
        })



class AssetHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """View asset history and timeline for owner's assets."""
    permission_classes = [IsAuthenticated]
    serializer_class = AssetEventSerializer
    
    def get_queryset(self):
        """Get events for assets assigned to current user."""
        asset_id = self.kwargs.get('asset_pk')
        
        # Verify user has access to this asset
        try:
            asset = Asset.objects.get(id=asset_id, assigned_to=self.request.user)
        except Asset.DoesNotExist:
            return AssetEvent.objects.none()
        
        queryset = AssetEvent.objects.filter(
            asset=asset
        ).select_related(
            'asset', 'actor', 'related_checkout', 'related_maintenance', 'related_transfer'
        ).order_by('-event_date')
        
        # Filter by event type
        event_type = self.request.query_params.get('event_type', None)
        if event_type:
            queryset = queryset.filter(event_type=event_type)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        
        if start_date:
            from datetime import datetime
            start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            queryset = queryset.filter(event_date__gte=start_datetime)
        
        if end_date:
            from datetime import datetime
            end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            queryset = queryset.filter(event_date__lte=end_datetime)
        
        # Search across descriptions
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(description__icontains=search)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def timeline(self, request, asset_pk=None):
        """Get timeline-optimized data structure."""
        queryset = self.get_queryset()
        
        # Group events by date
        from collections import defaultdict
        from datetime import datetime
        
        timeline_data = defaultdict(list)
        event_counts = defaultdict(int)
        
        for event in queryset:
            date_key = event.event_date.date().isoformat()
            timeline_data[date_key].append(AssetEventSerializer(event).data)
            event_counts[event.event_type] += 1
        
        # Convert to sorted list
        timeline = [
            {
                'date': date,
                'events': events
            }
            for date, events in sorted(timeline_data.items(), reverse=True)
        ]
        
        return Response({
            'timeline': timeline,
            'statistics': {
                'total_events': queryset.count(),
                'event_counts_by_type': dict(event_counts),
                'date_range': {
                    'start': queryset.last().event_date.isoformat() if queryset.exists() else None,
                    'end': queryset.first().event_date.isoformat() if queryset.exists() else None,
                }
            }
        })
    
    @action(detail=False, methods=['get'])
    def export(self, request, asset_pk=None):
        """Export asset history to CSV, PDF, or Excel."""
        queryset = self.get_queryset()
        export_format = request.query_params.get('format', 'csv')
        
        # Get asset for export
        asset_id = self.kwargs.get('asset_pk')
        try:
            asset = Asset.objects.get(id=asset_id, assigned_to=request.user)
        except Asset.DoesNotExist:
            return Response(
                {'error': 'Asset not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if export_format == 'csv':
            import csv
            from django.http import HttpResponse
            
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="asset_history_{asset.asset_id}.csv"'
            
            writer = csv.writer(response)
            writer.writerow(['Date', 'Event Type', 'Description', 'Actor', 'Details'])
            
            for event in queryset:
                writer.writerow([
                    event.event_date.strftime('%Y-%m-%d %H:%M:%S'),
                    event.get_event_type_display(),
                    event.description,
                    event.actor.get_full_name() if event.actor else 'System',
                    str(event.event_data)
                ])
            
            return response
        
        elif export_format == 'pdf':
            from django.http import HttpResponse
            from reportlab.lib.pagesizes import letter
            from reportlab.lib import colors
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from io import BytesIO
            
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter)
            elements = []
            styles = getSampleStyleSheet()
            
            # Title
            title = Paragraph(f"Asset History Report: {asset.asset_id}", styles['Title'])
            elements.append(title)
            elements.append(Spacer(1, 12))
            
            # Asset details
            asset_info = Paragraph(f"<b>Asset:</b> {asset.name}<br/><b>Status:</b> {asset.get_status_display()}", styles['Normal'])
            elements.append(asset_info)
            elements.append(Spacer(1, 12))
            
            # Events table
            data = [['Date', 'Event Type', 'Description', 'Actor']]
            for event in queryset[:100]:  # Limit to 100 events for PDF
                data.append([
                    event.event_date.strftime('%Y-%m-%d'),
                    event.get_event_type_display(),
                    event.description[:50] + '...' if len(event.description) > 50 else event.description,
                    event.actor.get_full_name() if event.actor else 'System'
                ])
            
            table = Table(data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            elements.append(table)
            
            doc.build(elements)
            buffer.seek(0)
            
            response = HttpResponse(buffer, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="asset_history_{asset.asset_id}.pdf"'
            return response
        
        else:
            return Response(
                {'error': 'Invalid export format. Use csv or pdf'},
                status=status.HTTP_400_BAD_REQUEST
            )



class QRScannerViewSet(viewsets.ViewSet):
    """QR code scanning and quick actions for asset owners."""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def scan(self, request):
        """
        Scan QR code and return asset details with available actions.
        
        POST /api/owner/qr/scan/
        Body: {qr_data: string}
        """
        from apps.assets.qr_service import qr_service
        
        qr_data = request.data.get('qr_data')
        if not qr_data:
            return Response(
                {'error': 'QR data is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Decrypt QR code
        decrypted = qr_service.decrypt_qr_data(qr_data)
        
        if not decrypted['valid']:
            return Response(
                {
                    'error': 'Invalid or expired QR code',
                    'details': decrypted.get('error', 'QR code has expired'),
                    'is_encrypted': False  # Signal that this might be a plain asset ID
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get asset
        asset_id = decrypted['asset_id']
        try:
            asset = Asset.objects.select_related(
                'campus', 'room__floor__building', 'assigned_to'
            ).get(asset_id=asset_id)
        except Asset.DoesNotExist:
            return Response(
                {'error': f'Asset {asset_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Determine available actions based on asset status and user permissions
        actions = []
        
        # Everyone can view details
        actions.append('view_details')
        actions.append('view_history')
        
        # Check if user can report maintenance
        if asset.status != 'CONDEMNED':
            actions.append('report_maintenance')
        
        # Check if user can checkout
        if asset.status == 'AVAILABLE' and not AssetCheckout.objects.filter(
            asset=asset, is_returned=False
        ).exists():
            actions.append('request_checkout')
        
        # Check if user is assigned to this asset
        if asset.assigned_to == request.user:
            actions.append('view_my_asset')
        
        # Always allow sharing
        actions.append('share')
        
        # Cache this asset for offline use
        self._cache_asset_for_user(request.user, asset)
        
        return Response({
            'asset': AssetSerializer(asset).data,
            'actions': actions,
            'scan_timestamp': timezone.now().isoformat(),
            'qr_expires': decrypted['expires']
        })
    
    @action(detail=False, methods=['post'])
    def quick_maintenance(self, request):
        """
        Create maintenance request from QR scan with minimal form.
        
        POST /api/owner/qr/quick-maintenance/
        Body: {asset_id, priority, description, photo (optional)}
        """
        asset_id = request.data.get('asset_id')
        priority = request.data.get('priority', 'MEDIUM')
        description = request.data.get('description')
        category = request.data.get('category', 'OTHER')
        
        if not asset_id or not description:
            return Response(
                {'error': 'Asset ID and description are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get asset
        try:
            asset = Asset.objects.get(asset_id=asset_id)
        except Asset.DoesNotExist:
            return Response(
                {'error': f'Asset {asset_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create maintenance request
        maintenance_request = MaintenanceRequest.objects.create(
            asset=asset,
            requested_by=request.user,
            category=category,
            priority=priority,
            description=description,
            photo=request.data.get('photo')
        )
        
        # Create notification for property managers
        from apps.users.models import User
        managers = User.objects.filter(role='PROPERTY_MANAGER')
        for manager in managers:
            Notification.objects.create(
                user=manager,
                title='Quick Maintenance Request',
                message=f'{request.user.get_full_name()} reported {priority} priority issue for {asset.asset_id} via QR scan',
                notification_type='INFO'
            )
        
        return Response({
            'request_id': maintenance_request.request_id,
            'status': 'submitted',
            'message': 'Maintenance request created successfully',
            'request': MaintenanceRequestSerializer(maintenance_request).data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def offline_cache(self, request):
        """
        Get recently scanned assets for offline use.
        
        GET /api/owner/qr/offline-cache/
        """
        # Get user's recent scans from cache (stored in user profile or separate model)
        # For now, return user's assigned assets as offline cache
        assets = Asset.objects.filter(
            assigned_to=request.user
        ).select_related('campus', 'room')[:20]
        
        return Response({
            'assets': AssetSerializer(assets, many=True).data,
            'last_updated': timezone.now().isoformat(),
            'cache_size': assets.count()
        })
    
    @action(detail=False, methods=['post'])
    def sync_offline_actions(self, request):
        """
        Sync actions that were queued while offline.
        
        POST /api/owner/qr/sync-offline-actions/
        Body: {actions: [{type, data, timestamp}]}
        """
        actions = request.data.get('actions', [])
        results = []
        
        for action in actions:
            action_type = action.get('type')
            action_data = action.get('data')
            
            try:
                if action_type == 'quick_maintenance':
                    # Create maintenance request
                    result = self.quick_maintenance(request)
                    results.append({
                        'action': action,
                        'status': 'success',
                        'result': result.data
                    })
                else:
                    results.append({
                        'action': action,
                        'status': 'skipped',
                        'reason': f'Unknown action type: {action_type}'
                    })
            except Exception as e:
                results.append({
                    'action': action,
                    'status': 'failed',
                    'error': str(e)
                })
        
        return Response({
            'synced': len([r for r in results if r['status'] == 'success']),
            'failed': len([r for r in results if r['status'] == 'failed']),
            'results': results
        })
    
    def _cache_asset_for_user(self, user, asset):
        """Store asset in user's recent scans cache."""
        # This could be implemented with Redis or a database model
        # For now, we'll skip the implementation
        pass



class QRCodeGeneratorViewSet(viewsets.ViewSet):
    """Generate encrypted QR codes for assets."""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def generate(self, request):
        """
        Generate encrypted QR code for an asset.
        
        GET /api/owner/qr-generate/generate/?asset_id=DMU-MAIN-EQP-00001
        """
        from apps.assets.qr_service import qr_service
        from django.http import HttpResponse
        
        asset_id = request.query_params.get('asset_id')
        if not asset_id:
            return Response(
                {'error': 'asset_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify asset exists
        try:
            asset = Asset.objects.get(asset_id=asset_id)
        except Asset.DoesNotExist:
            return Response(
                {'error': f'Asset {asset_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Generate QR code
        qr_bytes = qr_service.generate_qr_code(asset_id)
        
        # Return as image
        response = HttpResponse(qr_bytes, content_type='image/png')
        response['Content-Disposition'] = f'inline; filename="{asset_id}_qr.png"'
        return response
    
    @action(detail=False, methods=['get'])
    def test_data(self, request):
        """
        Get encrypted data for testing.
        
        GET /api/owner/qr-generate/test-data/?asset_id=DMU-MAIN-EQP-00001
        """
        from apps.assets.qr_service import qr_service
        
        asset_id = request.query_params.get('asset_id')
        if not asset_id:
            return Response(
                {'error': 'asset_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify asset exists
        try:
            asset = Asset.objects.get(asset_id=asset_id)
        except Asset.DoesNotExist:
            return Response(
                {'error': f'Asset {asset_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Generate encrypted data
        encrypted_data = qr_service.encrypt_asset_id(asset_id)
        
        return Response({
            'asset_id': asset_id,
            'encrypted_data': encrypted_data,
            'qr_url': f'/api/owner/qr-generate/generate/?asset_id={asset_id}',
            'instructions': 'Use the encrypted_data to test scanning, or download the QR code from qr_url'
        })



class FeedbackViewSet(viewsets.ModelViewSet):
    """Feedback and rating system for owners."""
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        from apps.core.serializers import ServiceRatingSerializer, AssetFeedbackSerializer, PortalSuggestionSerializer
        
        action_map = {
            'service_rating': ServiceRatingSerializer,
            'service_ratings': ServiceRatingSerializer,
            'asset_feedback': AssetFeedbackSerializer,
            'asset_feedback_list': AssetFeedbackSerializer,
            'portal_suggestion': PortalSuggestionSerializer,
            'portal_suggestions': PortalSuggestionSerializer,
        }
        return action_map.get(self.action, ServiceRatingSerializer)
    
    @action(detail=False, methods=['post'], url_path='service-rating')
    def service_rating(self, request):
        """
        Submit a service rating for completed maintenance.
        
        POST /api/owner/feedback/service-rating/
        Body: {
            maintenance_request: id,
            overall_rating: 1-5,
            timeliness_rating: 1-5,
            quality_rating: 1-5,
            communication_rating: 1-5,
            feedback_text: string (optional),
            is_anonymous: boolean (optional)
        }
        """
        from apps.core.serializers import ServiceRatingSerializer
        from apps.core.feedback_models import ServiceRating
        
        serializer = ServiceRatingSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(rated_by=request.user)
            
            # Notify property managers about new rating
            from apps.users.models import User
            managers = User.objects.filter(role='PROPERTY_MANAGER')
            for manager in managers:
                Notification.objects.create(
                    user=manager,
                    title='New Service Rating',
                    message=f'New {serializer.data["overall_rating"]}-star rating received for maintenance request',
                    notification_type='INFO',
                    link=f'/dashboard/maintenance/requests/{serializer.data["maintenance_request"]}',
                    related_model='ServiceRating',
                    related_id=serializer.instance.id
                )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], url_path='service-ratings')
    def service_ratings(self, request):
        """
        Get all service ratings submitted by current user.
        
        GET /api/owner/feedback/service-ratings/
        """
        from apps.core.serializers import ServiceRatingSerializer
        from apps.core.feedback_models import ServiceRating
        
        ratings = ServiceRating.objects.filter(
            rated_by=request.user
        ).select_related(
            'maintenance_request', 'responded_by'
        ).order_by('-created_at')
        
        serializer = ServiceRatingSerializer(ratings, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='asset-feedback')
    def asset_feedback(self, request):
        """
        Submit feedback on an asset.
        
        POST /api/owner/feedback/asset-feedback/
        Body: {
            asset: id,
            feedback_type: CONDITION|REPLACEMENT|MISSING_FEATURE|GENERAL,
            description: string,
            photos: [urls] (optional)
        }
        """
        from apps.core.serializers import AssetFeedbackSerializer
        from apps.core.feedback_models import AssetFeedback
        
        serializer = AssetFeedbackSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(submitted_by=request.user)
            
            # Notify property managers
            from apps.users.models import User
            managers = User.objects.filter(role='PROPERTY_MANAGER')
            asset = serializer.instance.asset
            for manager in managers:
                Notification.objects.create(
                    user=manager,
                    title='New Asset Feedback',
                    message=f'{request.user.get_full_name()} submitted {serializer.instance.get_feedback_type_display()} feedback for {asset.asset_id}',
                    notification_type='INFO',
                    link=f'/dashboard/assets/{asset.id}',
                    related_model='AssetFeedback',
                    related_id=serializer.instance.id
                )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], url_path='asset-feedback-list')
    def asset_feedback_list(self, request):
        """
        Get all asset feedback submitted by current user.
        
        GET /api/owner/feedback/asset-feedback-list/
        Query params: status (optional)
        """
        from apps.core.serializers import AssetFeedbackSerializer
        from apps.core.feedback_models import AssetFeedback
        
        queryset = AssetFeedback.objects.filter(
            submitted_by=request.user
        ).select_related(
            'asset', 'responded_by'
        ).order_by('-created_at')
        
        # Filter by status
        status_filter = request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        serializer = AssetFeedbackSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='portal-suggestion')
    def portal_suggestion(self, request):
        """
        Submit a portal improvement suggestion.
        
        POST /api/owner/feedback/portal-suggestion/
        Body: {
            category: UI|FEATURES|PERFORMANCE|MOBILE|OTHER,
            title: string,
            description: string,
            priority: LOW|MEDIUM|HIGH (optional),
            screenshots: [urls] (optional)
        }
        """
        from apps.core.serializers import PortalSuggestionSerializer
        from apps.core.feedback_models import PortalSuggestion
        
        serializer = PortalSuggestionSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(submitted_by=request.user)
            
            # Notify admins
            from apps.users.models import User
            admins = User.objects.filter(role='ADMIN')
            for admin in admins:
                Notification.objects.create(
                    user=admin,
                    title='New Portal Suggestion',
                    message=f'{request.user.get_full_name()} suggested: {serializer.data["title"]}',
                    notification_type='INFO',
                    link='/dashboard/admin/suggestions',
                    related_model='PortalSuggestion',
                    related_id=serializer.instance.id
                )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], url_path='portal-suggestions')
    def portal_suggestions(self, request):
        """
        Get all portal suggestions (public view).
        
        GET /api/owner/feedback/portal-suggestions/
        Query params: category (optional), status (optional), my_suggestions (optional)
        """
        from apps.core.serializers import PortalSuggestionSerializer
        from apps.core.feedback_models import PortalSuggestion
        
        queryset = PortalSuggestion.objects.all().select_related('submitted_by')
        
        # Filter by category
        category_filter = request.query_params.get('category', None)
        if category_filter:
            queryset = queryset.filter(category=category_filter)
        
        # Filter by status
        status_filter = request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter to user's own suggestions
        my_suggestions = request.query_params.get('my_suggestions', None)
        if my_suggestions == 'true':
            queryset = queryset.filter(submitted_by=request.user)
        
        queryset = queryset.order_by('-votes', '-created_at')
        
        serializer = PortalSuggestionSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='vote')
    def vote(self, request, pk=None):
        """
        Vote for a portal suggestion.
        
        POST /api/owner/feedback/portal-suggestions/{id}/vote/
        """
        from apps.core.feedback_models import PortalSuggestion
        
        try:
            suggestion = PortalSuggestion.objects.get(pk=pk)
        except PortalSuggestion.DoesNotExist:
            return Response(
                {'error': 'Suggestion not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user already voted
        if suggestion.voters.filter(id=request.user.id).exists():
            # Unvote
            suggestion.voters.remove(request.user)
            suggestion.votes -= 1
            suggestion.save()
            return Response({
                'message': 'Vote removed',
                'votes': suggestion.votes,
                'user_voted': False
            })
        else:
            # Vote
            suggestion.voters.add(request.user)
            suggestion.votes += 1
            suggestion.save()
            
            # Notify suggestion author
            if suggestion.submitted_by != request.user:
                Notification.objects.create(
                    user=suggestion.submitted_by,
                    title='Suggestion Upvoted',
                    message=f'{request.user.get_full_name()} upvoted your suggestion: {suggestion.title}',
                    notification_type='INFO'
                )
            
            return Response({
                'message': 'Vote added',
                'votes': suggestion.votes,
                'user_voted': True
            })
