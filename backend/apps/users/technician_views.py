"""Views for Technician Portal."""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count, Sum, F, Avg
from django.utils import timezone
from datetime import timedelta, datetime

from apps.maintenance.models import WorkOrder, MaintenanceRequest
from apps.maintenance.serializers import WorkOrderSerializer, MaintenanceRequestSerializer
from apps.core.models import Notification


def _check_and_award_badges(technician):
    """Auto-award badges based on technician's current stats. Returns list of newly awarded badge types."""
    from apps.users.models import TechnicianBadge
    from apps.core.feedback_models import ServiceRating

    completed = WorkOrder.objects.filter(assigned_to=technician, request__status='COMPLETED')
    total_completed = completed.count()
    emergency_completed = completed.filter(request__priority='EMERGENCY').count()

    ratings = ServiceRating.objects.filter(maintenance_request__assigned_to=technician)
    avg_rating = ratings.aggregate(avg=Avg('overall_rating'))['avg'] or 0
    total_ratings = ratings.count()

    avg_hours = 0
    timed = completed.filter(started_at__isnull=False, completed_at__isnull=False)
    if timed.exists():
        total_secs = sum((wo.completed_at - wo.started_at).total_seconds() for wo in timed)
        avg_hours = total_secs / 3600 / timed.count()

    badge_criteria = {
        'first_complete':      total_completed >= 1,
        'emergency_responder': emergency_completed >= 5,
        'five_star':           avg_rating >= 4.5 and total_ratings >= 3,
        'speed_demon':         avg_hours > 0 and avg_hours < 2 and total_completed >= 5,
        'reliable':            total_completed >= 20,
        'century_club':        technician.performance_score >= 80,
        'team_player':         total_ratings >= 5,
        'veteran':             total_completed >= 50,
    }

    newly_awarded = []
    for badge_type, earned in badge_criteria.items():
        if earned:
            _, created = TechnicianBadge.objects.get_or_create(
                technician=technician, badge_type=badge_type
            )
            if created:
                newly_awarded.append(badge_type)
    return newly_awarded


# Labor rates per category (ETB per hour)
CATEGORY_LABOR_RATES = {
    'ELECTRICAL':  75,   # ETB 75/hr — specialized skill
    'PLUMBING':    65,   # ETB 65/hr
    'HVAC':        80,   # ETB 80/hr — complex systems
    'STRUCTURAL':  60,   # ETB 60/hr
    'EQUIPMENT':   70,   # ETB 70/hr
    'OTHER':       50,   # ETB 50/hr — general
}


class TechnicianDashboardViewSet(viewsets.ViewSet):
    """Dashboard data for technicians."""
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """Get technician dashboard statistics."""
        user = request.user
        
        # Get work orders assigned to this technician
        my_work_orders = WorkOrder.objects.filter(assigned_to=user)
        
        # Today's work orders
        today = timezone.now().date()
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = timezone.now().replace(hour=23, minute=59, second=59, microsecond=999999)
        next_week = today + timedelta(days=7)

        today_work_orders = my_work_orders.filter(
            scheduled_date__date=today
        ).select_related(
            'request__asset',
            'request__requested_by'
        ).order_by('scheduled_date', 'request__priority')

        # Upcoming work orders (next 7 days, excluding today)
        upcoming_work_orders = my_work_orders.filter(
            scheduled_date__date__gt=today,
            scheduled_date__date__lte=next_week,
            request__status__in=['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS']
        ).select_related(
            'request__asset',
            'request__requested_by'
        ).order_by('scheduled_date')[:10]

        # Calculate statistics
        stats = {
            'today_work_orders': today_work_orders.count(),
            'in_progress': my_work_orders.filter(request__status='IN_PROGRESS').count(),
            'completed_today': my_work_orders.filter(
                request__status='COMPLETED',
                completed_at__date=today
            ).count(),
            'overdue': my_work_orders.filter(
                scheduled_date__date__lt=today,
                request__status__in=['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS']
            ).count(),
            'total_assigned': my_work_orders.filter(
                request__status__in=['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS']
            ).count(),
            'completed_this_week': my_work_orders.filter(
                request__status='COMPLETED',
                completed_at__date__gte=today - timedelta(days=today.weekday())
            ).count(),
            'completed_this_month': my_work_orders.filter(
                request__status='COMPLETED',
                completed_at__date__gte=today.replace(day=1)
            ).count(),
        }
        
        # Check if clocked in (you can implement time tracking model)
        clocked_in = False  # Placeholder
        
        return Response({
            'statistics': stats,
            'today_work_orders': WorkOrderSerializer(today_work_orders, many=True).data,
            'upcoming_work_orders': WorkOrderSerializer(upcoming_work_orders, many=True).data,
            'clocked_in': clocked_in,
            'performance_score': round(user.performance_score, 1),
            'total_ratings': user.total_ratings,
        })


class TechnicianWorkOrdersViewSet(viewsets.ModelViewSet):
    """Work orders for the current technician."""
    permission_classes = [IsAuthenticated]
    serializer_class = WorkOrderSerializer
    
    def get_queryset(self):
        """Get work orders assigned to current technician."""
        queryset = WorkOrder.objects.filter(
            assigned_to=self.request.user
        ).select_related(
            'request__asset__campus',
            'request__requested_by',
            'assigned_to'
        ).order_by('-scheduled_date', '-request__priority')
        
        # Filter by status
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(request__status=status_filter)
        
        # Filter by priority
        priority_filter = self.request.query_params.get('priority', None)
        if priority_filter:
            queryset = queryset.filter(request__priority=priority_filter)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        
        if start_date:
            queryset = queryset.filter(scheduled_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(scheduled_date__lte=end_date)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def start_work(self, request, pk=None):
        """Start working on a work order."""
        work_order = self.get_object()
        
        if work_order.request.status not in ['SUBMITTED', 'ASSIGNED']:
            return Response(
                {'error': 'Can only start pending work orders'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        work_order.started_at = timezone.now()
        work_order.save()
        
        # Update maintenance request status
        work_order.request.status = 'IN_PROGRESS'
        work_order.request.save()
        
        # Notify requester
        if work_order.request.requested_by:
            Notification.objects.create(
                user=work_order.request.requested_by,
                notification_type='system',
                title='Work Started',
                message=f'Technician {request.user.get_full_name()} has started working on your maintenance request',
                link=f'/dashboard/maintenance/requests/{work_order.request.id}'
            )
        
        return Response({
            'message': 'Work order started',
            'work_order': WorkOrderSerializer(work_order).data
        })
    
    @action(detail=True, methods=['post'])
    def complete_work(self, request, pk=None):
        """Complete a work order."""
        work_order = self.get_object()
        
        if work_order.request.status not in ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS']:
            return Response(
                {'error': 'Work order already completed or cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from decimal import Decimal
        completion_notes = request.data.get('completion_notes', '')
        labor_hours = float(request.data.get('labor_hours', 0))
        cost_materials = float(request.data.get('cost_materials', 0))

        # Auto-calculate labor cost based on category rate
        category = work_order.request.category if work_order.request else 'OTHER'
        hourly_rate = CATEGORY_LABOR_RATES.get(category, CATEGORY_LABOR_RATES['OTHER'])
        cost_labor = round(labor_hours * hourly_rate, 2)

        work_order.completed_at = timezone.now()
        work_order.notes = completion_notes
        work_order.cost_labor = Decimal(str(cost_labor))
        work_order.cost_materials = Decimal(str(cost_materials))
        work_order.save()
        
        work_order.request.status = 'COMPLETED'
        work_order.request.save()
        
        # Award badges
        _check_and_award_badges(request.user)
        
        if work_order.request.requested_by:
            Notification.objects.create(
                user=work_order.request.requested_by,
                notification_type='system',
                title='Work Completed',
                message=f'Your maintenance request has been completed by {request.user.get_full_name()}',
                link=f'/dashboard/maintenance/requests/{work_order.request.id}'
            )
        
        return Response({
            'message': 'Work order completed successfully',
            'cost_labor': cost_labor,
            'cost_materials': cost_materials,
            'cost_total': cost_labor + cost_materials,
            'work_order': WorkOrderSerializer(work_order).data
        })

    @action(detail=True, methods=['get'], url_path='cost-preview')
    def cost_preview(self, request, pk=None):
        """
        GET /api/technician/work-orders/{id}/cost-preview/?labor_hours=2
        Returns auto-calculated labor cost based on category rate.
        """
        work_order = self.get_object()
        labor_hours = float(request.query_params.get('labor_hours', 0))
        category = work_order.request.category if work_order.request else 'OTHER'
        hourly_rate = CATEGORY_LABOR_RATES.get(category, CATEGORY_LABOR_RATES['OTHER'])
        cost_labor = round(labor_hours * hourly_rate, 2)

        return Response({
            'category': category,
            'hourly_rate': hourly_rate,
            'labor_hours': labor_hours,
            'cost_labor': cost_labor,
            'rates': CATEGORY_LABOR_RATES,
        })

    # ── Feature 1: Photo Evidence ──────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='upload-photo')
    def upload_photo(self, request, pk=None):
        """Upload a before/after/progress photo for a work order."""
        from apps.maintenance.models import WorkOrderPhoto
        work_order = self.get_object()

        photo_file = request.FILES.get('photo')
        if not photo_file:
            return Response({'error': 'No photo file provided'}, status=status.HTTP_400_BAD_REQUEST)

        photo_type = request.data.get('photo_type', 'progress')
        caption = request.data.get('caption', '')

        photo = WorkOrderPhoto.objects.create(
            work_order=work_order,
            uploaded_by=request.user,
            photo=photo_file,
            photo_type=photo_type,
            caption=caption,
        )

        return Response({
            'id': photo.id,
            'photo_url': request.build_absolute_uri(photo.photo.url),
            'photo_type': photo.photo_type,
            'caption': photo.caption,
            'uploaded_at': photo.created_at.isoformat(),
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='photos')
    def get_photos(self, request, pk=None):
        """Get all photos for a work order."""
        from apps.maintenance.models import WorkOrderPhoto
        work_order = self.get_object()
        photos = WorkOrderPhoto.objects.filter(work_order=work_order)
        data = [{
            'id': p.id,
            'photo_url': request.build_absolute_uri(p.photo.url),
            'photo_type': p.photo_type,
            'caption': p.caption,
            'uploaded_by': p.uploaded_by.get_full_name() if p.uploaded_by else '',
            'uploaded_at': p.created_at.isoformat(),
        } for p in photos]
        return Response({'photos': data})

    @action(detail=True, methods=['delete'], url_path='photos/(?P<photo_id>[0-9]+)')
    def delete_photo(self, request, pk=None, photo_id=None):
        """Delete a photo."""
        from apps.maintenance.models import WorkOrderPhoto
        try:
            photo = WorkOrderPhoto.objects.get(id=photo_id, work_order_id=pk, uploaded_by=request.user)
            photo.photo.delete(save=False)
            photo.delete()
            return Response({'message': 'Photo deleted'})
        except WorkOrderPhoto.DoesNotExist:
            return Response({'error': 'Photo not found'}, status=status.HTTP_404_NOT_FOUND)

    # ── Feature 2: Checklist ───────────────────────────────────────────────

    @action(detail=True, methods=['get', 'post'], url_path='checklist')
    def checklist(self, request, pk=None):
        """GET: fetch checklist. POST: create checklist from template."""
        from apps.maintenance.models import WorkOrderChecklist, ChecklistTemplate, ChecklistEntry

        work_order = self.get_object()

        if request.method == 'GET':
            try:
                cl = work_order.checklist
                entries = [{
                    'id': e.id,
                    'text': e.item_text,
                    'is_required': e.is_required,
                    'is_checked': e.is_checked,
                    'notes': e.notes,
                    'order': e.order,
                } for e in cl.entries.all()]
                return Response({
                    'id': cl.id,
                    'completion_percentage': cl.completion_percentage,
                    'is_complete': cl.is_complete,
                    'entries': entries,
                })
            except WorkOrderChecklist.DoesNotExist:
                return Response({'entries': [], 'completion_percentage': 0, 'is_complete': False})

        # POST: create checklist
        category = work_order.request.category if work_order.request else 'GENERAL'
        template = ChecklistTemplate.objects.filter(category=category, is_active=True).first()
        if not template:
            template = ChecklistTemplate.objects.filter(category='GENERAL', is_active=True).first()

        cl, created = WorkOrderChecklist.objects.get_or_create(
            work_order=work_order,
            defaults={'template': template}
        )

        if created and template:
            for item in template.items.all():
                ChecklistEntry.objects.create(
                    checklist=cl,
                    item_text=item.text,
                    is_required=item.is_required,
                    order=item.order,
                )
        elif created:
            # Default safety checklist
            defaults = [
                ('Verify work area is safe', True, 1),
                ('Gather required tools and materials', True, 2),
                ('Inspect asset before starting work', True, 3),
                ('Perform maintenance/repair work', True, 4),
                ('Test asset after repair', True, 5),
                ('Clean up work area', True, 6),
                ('Document any additional issues found', False, 7),
            ]
            for text, required, order in defaults:
                ChecklistEntry.objects.create(
                    checklist=cl, item_text=text, is_required=required, order=order
                )

        entries = [{
            'id': e.id,
            'text': e.item_text,
            'is_required': e.is_required,
            'is_checked': e.is_checked,
            'notes': e.notes,
            'order': e.order,
        } for e in cl.entries.all()]

        return Response({
            'id': cl.id,
            'completion_percentage': cl.completion_percentage,
            'is_complete': cl.is_complete,
            'entries': entries,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='checklist/(?P<entry_id>[0-9]+)')
    def update_checklist_entry(self, request, pk=None, entry_id=None):
        """Toggle a checklist entry."""
        from apps.maintenance.models import ChecklistEntry
        try:
            entry = ChecklistEntry.objects.get(id=entry_id, checklist__work_order_id=pk)
            entry.is_checked = request.data.get('is_checked', entry.is_checked)
            entry.notes = request.data.get('notes', entry.notes)
            entry.save()
            return Response({
                'id': entry.id,
                'is_checked': entry.is_checked,
                'notes': entry.notes,
                'completion_percentage': entry.checklist.completion_percentage,
                'is_complete': entry.checklist.is_complete,
            })
        except ChecklistEntry.DoesNotExist:
            return Response({'error': 'Entry not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def add_note(self, request, pk=None):
        """Add a progress note to work order."""
        work_order = self.get_object()
        note = request.data.get('note', '')
        
        if not note:
            return Response(
                {'error': 'Note is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Add note to work order notes
        current_notes = work_order.notes or ''
        timestamp = timezone.now().strftime('%Y-%m-%d %H:%M:%S')
        new_note = f"\n[{timestamp}] {request.user.get_full_name()}: {note}"
        work_order.notes = current_notes + new_note
        work_order.save()
        
        return Response({
            'message': 'Note added successfully',
            'work_order': WorkOrderSerializer(work_order).data
        })
    
    @action(detail=True, methods=['post'])
    def request_parts(self, request, pk=None):
        """Request parts for a work order."""
        work_order = self.get_object()
        parts = request.data.get('parts', [])
        reason = request.data.get('reason', '')
        
        if not parts:
            return Response(
                {'error': 'Parts list is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create notification for supervisor/property manager
        from apps.users.models import User
        managers = User.objects.filter(role__in=['PROPERTY_MANAGER', 'SUPERVISOR'])
        
        for manager in managers:
            Notification.objects.create(
                user=manager,
                notification_type='system',
                title='Parts Request',
                message=f'{request.user.get_full_name()} requested parts for work order #{work_order.id}: {reason}',
                link=f'/dashboard/maintenance/work-orders/{work_order.id}'
            )
        
        return Response({
            'message': 'Parts request submitted successfully'
        })

    # ── Feature 13: Direct Messages ────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='messages')
    def get_messages(self, request, pk=None):
        """GET /api/technician/work-orders/{id}/messages/ — fetch all messages."""
        from apps.maintenance.models import WorkOrderMessage
        work_order = self.get_object()

        # Mark unread messages as read for this user
        WorkOrderMessage.objects.filter(
            work_order=work_order,
            is_read=False
        ).exclude(sender=request.user).update(
            is_read=True,
            read_at=timezone.now()
        )

        messages = WorkOrderMessage.objects.filter(work_order=work_order).select_related('sender')
        data = [{
            'id': m.id,
            'sender_id': m.sender.id,
            'sender_name': m.sender.get_full_name(),
            'sender_role': m.sender.role,
            'message': m.message,
            'is_read': m.is_read,
            'created_at': m.created_at.isoformat(),
            'is_mine': m.sender_id == request.user.id,
        } for m in messages]

        return Response({'messages': data, 'count': len(data)})

    @action(detail=True, methods=['post'], url_path='messages/send')
    def send_message(self, request, pk=None):
        """POST /api/technician/work-orders/{id}/messages/send/ — send a message."""
        from apps.maintenance.models import WorkOrderMessage
        from apps.users.models import User

        work_order = self.get_object()
        text = request.data.get('message', '').strip()

        if not text:
            return Response({'error': 'Message cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)

        msg = WorkOrderMessage.objects.create(
            work_order=work_order,
            sender=request.user,
            message=text,
        )

        # Notify the other party
        if request.user.role == 'MAINTENANCE_TECHNICIAN':
            # Notify supervisors
            supervisors = User.objects.filter(role='MAINTENANCE_SUPERVISOR', is_active=True)
            for sup in supervisors:
                Notification.objects.create(
                    user=sup,
                    notification_type='system',
                    title=f'Message from {request.user.get_full_name()}',
                    message=f'WO-{work_order.id}: {text[:100]}',
                    link=f'/dashboard/maintenance/work-orders/{work_order.id}'
                )
        else:
            # Notify the technician
            if work_order.assigned_to:
                Notification.objects.create(
                    user=work_order.assigned_to,
                    notification_type='system',
                    title=f'Message from {request.user.get_full_name()}',
                    message=f'WO-{work_order.id}: {text[:100]}',
                    link=f'/dashboard/technician/work-orders/{work_order.id}'
                )

        return Response({
            'id': msg.id,
            'sender_name': msg.sender.get_full_name(),
            'sender_role': msg.sender.role,
            'message': msg.message,
            'created_at': msg.created_at.isoformat(),
            'is_mine': True,
        }, status=status.HTTP_201_CREATED)

    # ── Feature 5: Route Optimization ──────────────────────────────────────

    @action(detail=False, methods=['get'], url_path='today-route')
    def today_route(self, request):
        """GET /api/technician/work-orders/today-route/ — optimized order for today's tasks."""
        from django.utils import timezone

        user = request.user
        today = timezone.now().date()

        work_orders = WorkOrder.objects.filter(
            assigned_to=user,
            scheduled_date__date=today,
            request__status__in=['ASSIGNED', 'IN_PROGRESS']
        ).select_related(
            'request__asset__campus',
            'request__asset__room__floor__building',
        ).order_by('request__priority')

        if not work_orders.exists():
            return Response({'route': [], 'message': 'No active work orders today'})

        # Group by campus/building for route optimization
        # Priority order: EMERGENCY > HIGH > MEDIUM > LOW
        # Within same priority, group by campus to minimize travel
        PRIORITY_ORDER = {'EMERGENCY': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}

        route_items = []
        for wo in work_orders:
            req = wo.request
            asset = req.asset if req else None
            campus_name = asset.campus.name if asset and asset.campus else 'Unknown'
            building_name = ''
            if asset and asset.room:
                building_name = asset.room.floor.building.name if asset.room.floor else ''

            route_items.append({
                'work_order_id': wo.id,
                'request_id': req.request_id if req else '',
                'asset_name': asset.name if asset else '',
                'asset_id_display': asset.asset_id if asset else '',
                'campus': campus_name,
                'building': building_name,
                'location': f'{campus_name} - {building_name}'.strip(' -') if building_name else campus_name,
                'priority': req.priority if req else 'MEDIUM',
                'priority_order': PRIORITY_ORDER.get(req.priority if req else 'MEDIUM', 3),
                'category': req.category if req else '',
                'estimated_hours': wo.estimated_hours or 1,
                'scheduled_time': wo.scheduled_date.strftime('%H:%M') if wo.scheduled_date else None,
                'status': req.status if req else '',
            })

        # Nearest-neighbor greedy sort: group by campus, sort by priority within campus
        # Step 1: Sort by priority first (emergencies always first)
        route_items.sort(key=lambda x: x['priority_order'])

        # Step 2: After emergencies, cluster by campus to minimize travel
        emergency_items = [r for r in route_items if r['priority'] == 'EMERGENCY']
        other_items = [r for r in route_items if r['priority'] != 'EMERGENCY']

        # Group non-emergency by campus
        campus_groups = {}
        for item in other_items:
            campus = item['campus']
            if campus not in campus_groups:
                campus_groups[campus] = []
            campus_groups[campus].append(item)

        # Sort campuses by highest priority task in each campus
        sorted_campuses = sorted(
            campus_groups.items(),
            key=lambda x: min(i['priority_order'] for i in x[1])
        )

        optimized = emergency_items.copy()
        for _, items in sorted_campuses:
            items.sort(key=lambda x: (x['priority_order'], x['building']))
            optimized.extend(items)

        # Add step numbers
        for i, item in enumerate(optimized):
            item['step'] = i + 1

        return Response({
            'route': optimized,
            'total_tasks': len(optimized),
            'estimated_total_hours': sum(r['estimated_hours'] for r in optimized),
            'campuses_visited': len(set(r['campus'] for r in optimized)),
        })

    # ── Feature 15: Completion Report ──────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='completion-report')
    def completion_report(self, request, pk=None):
        """GET /api/technician/work-orders/{id}/completion-report/ — report data."""
        from apps.maintenance.models import WorkOrderPhoto

        work_order = self.get_object()
        req = work_order.request
        asset = req.asset if req else None

        if req and req.status != 'COMPLETED':
            return Response(
                {'error': 'Report only available for completed work orders'},
                status=status.HTTP_400_BAD_REQUEST
            )

        photos = WorkOrderPhoto.objects.filter(work_order=work_order)
        before_photos = [request.build_absolute_uri(p.photo.url) for p in photos.filter(photo_type='before')]
        after_photos  = [request.build_absolute_uri(p.photo.url) for p in photos.filter(photo_type='after')]

        duration_hours = None
        if work_order.started_at and work_order.completed_at:
            duration_hours = round((work_order.completed_at - work_order.started_at).total_seconds() / 3600, 2)

        # Build location string from asset relations
        asset_name = asset.name if asset else ''
        asset_id_str = asset.asset_id if asset else ''
        asset_location = ''
        if asset:
            if asset.campus:
                asset_location = asset.campus.name
            if asset.room:
                asset_location += f' - {asset.room.name}' if asset_location else asset.room.name
        campus_name = asset.campus.name if asset and asset.campus else ''

        # Requested by name
        requested_by_name = req.requested_by.get_full_name() if req and req.requested_by else ''

        report = {
            'work_order_id': f'WO-{work_order.id}',
            'request_id': req.request_id if req else '',
            'generated_at': timezone.now().isoformat(),
            'asset': {
                'name': asset_name,
                'id': asset_id_str,
                'location': asset_location,
                'campus': campus_name,
            },
            'request': {
                'category': req.category if req else '',
                'priority': req.priority if req else '',
                'description': req.description if req else '',
                'submitted_by': requested_by_name,
                'submitted_at': req.created_at.isoformat() if req else '',
            },
            'work': {
                'technician': work_order.assigned_to.get_full_name() if work_order.assigned_to else '',
                'technician_specialization': work_order.assigned_to.specialization if work_order.assigned_to else '',
                'started_at': work_order.started_at.isoformat() if work_order.started_at else None,
                'completed_at': work_order.completed_at.isoformat() if work_order.completed_at else None,
                'duration_hours': duration_hours,
                'estimated_hours': work_order.estimated_hours,
                'completion_notes': work_order.notes or '',
                'cost_labor': float(work_order.cost_labor),
                'cost_materials': float(work_order.cost_materials),
                'cost_total': float(work_order.cost_total),
            },
            'photos': {
                'before': before_photos,
                'after': after_photos,
                'total': photos.count(),
            },
            'checklist': None,
        }

        # Include checklist if exists
        try:
            cl = work_order.checklist
            report['checklist'] = {
                'completion_percentage': cl.completion_percentage,
                'items': [{'text': e.item_text, 'checked': e.is_checked} for e in cl.entries.all()],
            }
        except Exception:
            pass

        return Response(report)


class TechnicianScheduleViewSet(viewsets.ViewSet):
    """Schedule view for technicians."""
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """Get technician's schedule."""
        user = request.user
        
        # Get date range from query params
        start_date = request.query_params.get('start_date', timezone.now().date())
        end_date = request.query_params.get('end_date', timezone.now().date() + timedelta(days=30))
        
        if isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date).date()
        if isinstance(end_date, str):
            end_date = datetime.fromisoformat(end_date).date()
        
        # Get work orders in date range using __date lookup to handle timezone correctly
        work_orders = WorkOrder.objects.filter(
            assigned_to=user,
            scheduled_date__date__gte=start_date,
            scheduled_date__date__lte=end_date
        ).select_related(
            'request__asset',
            'request__requested_by'
        ).order_by('scheduled_date', 'request__priority')
        
        # Group by LOCAL date (extract date part from datetime)
        schedule = {}
        for wo in work_orders:
            # Use .date() to get just the date portion, avoiding timezone mismatch
            date_key = wo.scheduled_date.date().isoformat()
            if date_key not in schedule:
                schedule[date_key] = []
            schedule[date_key].append(WorkOrderSerializer(wo).data)
        
        return Response({
            'schedule': schedule,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
        })


class TechnicianPerformanceViewSet(viewsets.ViewSet):
    """Performance metrics for technicians."""
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """Get technician performance metrics."""
        user = request.user
        
        # Get time period
        period = request.query_params.get('period', 'month')  # week, month, year
        
        if period == 'week':
            start_date = timezone.now().date() - timedelta(days=7)
        elif period == 'year':
            start_date = timezone.now().date() - timedelta(days=365)
        else:  # month
            start_date = timezone.now().date() - timedelta(days=30)
        
        work_orders = WorkOrder.objects.filter(
            assigned_to=user,
            created_at__date__gte=start_date
        ).select_related('request')
        
        # Filter by request status since WorkOrder doesn't have status field
        completed = work_orders.filter(request__status='COMPLETED')
        in_progress = work_orders.filter(request__status='IN_PROGRESS')
        pending = work_orders.filter(request__status__in=['SUBMITTED', 'ASSIGNED'])
        
        # Calculate metrics
        metrics = {
            'total_assigned': work_orders.count(),
            'completed': completed.count(),
            'in_progress': in_progress.count(),
            'pending': pending.count(),
            'completion_rate': (completed.count() / work_orders.count() * 100) if work_orders.count() > 0 else 0,
            'avg_completion_time': self._calculate_avg_completion_time(completed),
            'total_labor_hours': completed.aggregate(Sum('cost_labor'))['cost_labor__sum'] or 0,
            'by_priority': {
                'EMERGENCY': completed.filter(request__priority='EMERGENCY').count(),
                'HIGH': completed.filter(request__priority='HIGH').count(),
                'MEDIUM': completed.filter(request__priority='MEDIUM').count(),
                'LOW': completed.filter(request__priority='LOW').count(),
            },
            'by_category': list(
                completed.values('request__category')
                .annotate(count=Count('id'))
                .order_by('-count')
            ),
            # Auto-calculated performance score from service ratings
            'performance_score': round(user.performance_score, 1),
            'total_ratings': user.total_ratings,
        }
        
        return Response(metrics)
    
    def _calculate_avg_completion_time(self, work_orders):
        """Calculate average completion time in hours."""
        total_time = timedelta()
        count = 0
        
        for wo in work_orders:
            if wo.started_at and wo.completed_at:
                total_time += (wo.completed_at - wo.started_at)
                count += 1
        
        if count == 0:
            return 0
        
        avg_seconds = total_time.total_seconds() / count
        return round(avg_seconds / 3600, 2)  # Convert to hours

    @action(detail=False, methods=['get'], url_path='my-ratings')
    def my_ratings(self, request):
        """
        Get all service ratings received by this technician.
        GET /api/technician/performance/my-ratings/
        """
        from apps.core.feedback_models import ServiceRating
        from django.db.models import Avg

        user = request.user
        ratings = ServiceRating.objects.filter(
            maintenance_request__assigned_to=user
        ).select_related('rated_by', 'maintenance_request').order_by('-created_at')

        total = ratings.count()
        if total == 0:
            return Response({
                'avg_overall': None,
                'avg_timeliness': None,
                'avg_quality': None,
                'avg_communication': None,
                'total_ratings': 0,
                'performance_score': user.performance_score,
                'recent_reviews': []
            })

        agg = ratings.aggregate(
            avg_overall=Avg('overall_rating'),
            avg_timeliness=Avg('timeliness_rating'),
            avg_quality=Avg('quality_rating'),
            avg_communication=Avg('communication_rating'),
        )

        recent = []
        for r in ratings[:5]:
            recent.append({
                'overall_rating': r.overall_rating,
                'feedback_text': r.feedback_text,
                'is_anonymous': r.is_anonymous,
                'rated_by_name': 'Anonymous' if r.is_anonymous else r.rated_by.get_full_name(),
                'maintenance_request_id': r.maintenance_request.request_id,
                'created_at': r.created_at.isoformat(),
            })

        return Response({
            'avg_overall': round(agg['avg_overall'], 2) if agg['avg_overall'] else None,
            'avg_timeliness': round(agg['avg_timeliness'], 2) if agg['avg_timeliness'] else None,
            'avg_quality': round(agg['avg_quality'], 2) if agg['avg_quality'] else None,
            'avg_communication': round(agg['avg_communication'], 2) if agg['avg_communication'] else None,
            'total_ratings': total,
            'performance_score': user.performance_score,
            'recent_reviews': recent,
        })

    @action(detail=False, methods=['get'], url_path='my-badges')
    def my_badges(self, request):
        """GET /api/technician/performance/my-badges/ — badges for current technician."""
        from apps.users.models import TechnicianBadge

        user = request.user
        badges = TechnicianBadge.objects.filter(technician=user)

        # Also check for new badges
        _check_and_award_badges(user)
        badges = TechnicianBadge.objects.filter(technician=user)

        data = [{
            'badge_type': b.badge_type,
            'label': b.get_badge_type_display(),
            'description': b.description,
            'awarded_at': b.awarded_at.isoformat(),
        } for b in badges]

        return Response({'badges': data, 'total': len(data)})

    @action(detail=False, methods=['get'], url_path='leaderboard')
    def leaderboard(self, request):
        """GET /api/technician/performance/leaderboard/ — ranked technicians."""
        from apps.users.models import User, TechnicianBadge
        from apps.core.feedback_models import ServiceRating

        technicians = User.objects.filter(
            role='MAINTENANCE_TECHNICIAN',
            is_active=True
        ).annotate(
            total_completed=Count(
                'work_orders',
                filter=Q(work_orders__request__status='COMPLETED')
            )
        )

        board = []
        for tech in technicians:
            badge_count = TechnicianBadge.objects.filter(technician=tech).count()
            board.append({
                'id': tech.id,
                'name': tech.get_full_name(),
                'specialization': tech.specialization or 'GENERAL',
                'performance_score': round(tech.performance_score, 1),
                'total_ratings': tech.total_ratings,
                'total_completed': tech.total_completed,
                'badge_count': badge_count,
            })

        # Sort by performance_score desc, then total_completed
        board.sort(key=lambda x: (-x['performance_score'], -x['total_completed']))

        # Add rank
        for i, entry in enumerate(board):
            entry['rank'] = i + 1

        # Mark current user
        current_id = request.user.id
        for entry in board:
            entry['is_me'] = entry['id'] == current_id

        return Response({'leaderboard': board})


class TimeTrackingViewSet(viewsets.ViewSet):
    """Time tracking for technicians using TimeEntry model."""
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """GET /api/technician/time-tracking/ — history + summary."""
        from apps.users.models import TimeEntry
        from django.db.models import Sum, F, ExpressionWrapper, DurationField

        user = request.user
        today = timezone.now().date()
        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)

        entries = TimeEntry.objects.filter(technician=user).order_by('-clock_in')

        # Active session
        active = entries.filter(status='active').first()

        # Compute hours for completed entries
        def hours_for(qs):
            total = 0.0
            for e in qs.filter(status='completed'):
                if e.clock_out:
                    total += (e.clock_out - e.clock_in).total_seconds() / 3600
            return round(total, 2)

        today_entries = entries.filter(clock_in__date=today)
        week_entries  = entries.filter(clock_in__date__gte=week_start)
        month_entries = entries.filter(clock_in__date__gte=month_start)

        records = []
        for e in entries[:30]:
            records.append({
                'id': e.id,
                'date': e.clock_in.date().isoformat(),
                'clock_in': e.clock_in.strftime('%H:%M'),
                'clock_out': e.clock_out.strftime('%H:%M') if e.clock_out else None,
                'total_hours': e.total_hours,
                'status': e.status,
                'notes': e.notes,
            })

        return Response({
            'clocked_in': active is not None,
            'clock_in_time': active.clock_in.isoformat() if active else None,
            'active_entry_id': active.id if active else None,
            'records': records,
            'total_hours_today': hours_for(today_entries),
            'total_hours_week': hours_for(week_entries),
            'total_hours_month': hours_for(month_entries),
            'total_entries': entries.count(),
        })

    @action(detail=False, methods=['post'], url_path='clock-in')
    def clock_in(self, request):
        """POST /api/technician/time-tracking/clock-in/"""
        from apps.users.models import TimeEntry

        user = request.user
        # Prevent double clock-in
        active = TimeEntry.objects.filter(technician=user, status='active').first()
        if active:
            return Response(
                {'error': 'Already clocked in', 'clock_in_time': active.clock_in.isoformat()},
                status=status.HTTP_400_BAD_REQUEST
            )

        entry = TimeEntry.objects.create(
            technician=user,
            clock_in=timezone.now(),
            status='active'
        )
        return Response({
            'message': 'Clocked in successfully',
            'timestamp': entry.clock_in.isoformat(),
            'entry_id': entry.id,
        })

    @action(detail=False, methods=['post'], url_path='clock-out')
    def clock_out(self, request):
        """POST /api/technician/time-tracking/clock-out/"""
        from apps.users.models import TimeEntry

        user = request.user
        active = TimeEntry.objects.filter(technician=user, status='active').first()
        if not active:
            return Response(
                {'error': 'Not currently clocked in'},
                status=status.HTTP_400_BAD_REQUEST
            )

        active.clock_out = timezone.now()
        active.status = 'completed'
        active.notes = request.data.get('notes', '')
        active.save()

        return Response({
            'message': 'Clocked out successfully',
            'timestamp': active.clock_out.isoformat(),
            'total_hours': active.total_hours,
        })
