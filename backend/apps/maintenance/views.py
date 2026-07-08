from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.core.permissions import IsMaintenanceSupervisor, IsMaintenanceTechnician, IsOwnerOrPropertyManager
from apps.core.utils import log_action, get_client_ip, notify_maintenance_request_created, notify_request_completed
from .models import MaintenanceRequest, WorkOrder, PreventiveMaintenance
from .serializers import MaintenanceRequestSerializer, WorkOrderSerializer, PreventiveMaintenanceSerializer
from .routing import auto_assign_request, get_routing_explanation, suggest_technicians
from django.utils import timezone
from datetime import timedelta


# SLA hours and estimated hours by priority
PRIORITY_SLA = {
    'EMERGENCY': {'sla_hours': 24,  'estimated_hours': 2.0},
    'HIGH':      {'sla_hours': 72,  'estimated_hours': 4.0},
    'MEDIUM':    {'sla_hours': 168, 'estimated_hours': 6.0},
    'LOW':       {'sla_hours': 336, 'estimated_hours': 8.0},
}


def build_work_order_defaults(maintenance_request, assigned_to_id):
    """
    Build default values for a new work order based on request priority.
    - scheduled_date: now + SLA hours for the priority
    - estimated_hours: typical hours for the priority level
    """
    priority = maintenance_request.priority or 'MEDIUM'
    config = PRIORITY_SLA.get(priority, PRIORITY_SLA['MEDIUM'])
    return {
        'assigned_to_id': assigned_to_id,
        'scheduled_date': timezone.now() + timedelta(hours=config['sla_hours']),
        'estimated_hours': config['estimated_hours'],
    }


class MaintenanceRequestViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRequest.objects.select_related('asset', 'requested_by', 'assigned_to').all()
    serializer_class = MaintenanceRequestSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'priority', 'category', 'assigned_to']
    search_fields = ['request_id', 'description']
    
    def get_permissions(self):
        if self.action == 'create':
            return [IsOwnerOrPropertyManager()]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        """Create request and attempt automatic assignment only if enabled in settings."""
        request = serializer.save(requested_by=self.request.user)
        
        # Check if auto-assignment is enabled in system settings
        from apps.core.models import SystemSettings
        settings_obj = SystemSettings.objects.first()
        auto_assignment_enabled = settings_obj.auto_assignment if settings_obj else False
        
        if auto_assignment_enabled:
            # Attempt automatic routing
            assigned_technician = auto_assign_request(request)
            
            if assigned_technician:
                request.assigned_to = assigned_technician
                request.status = 'ASSIGNED'
                request.save()
                
                # Create work order with scheduled date and estimated hours
                work_order = WorkOrder.objects.create(
                    request=request,
                    **build_work_order_defaults(request, assigned_technician.id)
                )
                
                # Notify the auto-assigned technician
                from apps.core.models import Notification
                try:
                    Notification.objects.create(
                        user=assigned_technician,
                        title='New Work Order Auto-Assigned',
                        message=f'You have been automatically assigned to maintenance request {request.request_id} for {request.asset.asset_id}',
                        notification_type='INFO',
                        link=f'/dashboard/technician/work-orders/{work_order.id}'
                    )
                    print(f"✓ Auto-assignment notification created for {assigned_technician.username}")
                except Exception as e:
                    print(f"✗ Error creating auto-assignment notification: {str(e)}")
                
                # Log the automatic assignment
                explanation = get_routing_explanation(request, assigned_technician)
                log_action(
                    user=self.request.user,
                    action='CREATE',
                    model_name='MaintenanceRequest',
                    object_id=request.id,
                    details={
                        'request_id': request.request_id,
                        'auto_assigned': True,
                        'assigned_to': assigned_technician.username,
                        'routing_reason': explanation
                    },
                    ip_address=get_client_ip(self.request)
                )
        
        # Send notifications to supervisors
        notify_maintenance_request_created(request)
    
    @action(detail=True, methods=['patch'], permission_classes=[IsMaintenanceSupervisor])
    def assign(self, request, pk=None):
        """Assign request to a technician."""
        maintenance_request = self.get_object()
        technician_id = request.data.get('assigned_to')
        
        if not technician_id:
            return Response({'error': 'assigned_to is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        maintenance_request.assigned_to_id = technician_id
        maintenance_request.status = 'ASSIGNED'
        maintenance_request.save()
        
        # Create or update work order with scheduled date and estimated hours
        defaults = build_work_order_defaults(maintenance_request, technician_id)
        work_order, created = WorkOrder.objects.get_or_create(
            request=maintenance_request,
            defaults=defaults
        )
        if not created:
            # Update existing work order
            work_order.assigned_to_id = technician_id
            if not work_order.scheduled_date:
                work_order.scheduled_date = defaults['scheduled_date']
            if not work_order.estimated_hours:
                work_order.estimated_hours = defaults['estimated_hours']
            work_order.save(update_fields=['assigned_to', 'scheduled_date', 'estimated_hours'])
        
        # Notify the assigned technician
        from apps.core.models import Notification
        from apps.users.models import User
        
        try:
            technician = User.objects.get(id=technician_id)
            notification = Notification.objects.create(
                user=technician,
                title='New Work Order Assigned',
                message=f'You have been assigned to maintenance request {maintenance_request.request_id} for {maintenance_request.asset.asset_id}',
                notification_type='INFO',
                link=f'/dashboard/technician/work-orders/{work_order.id}'
            )
            print(f"✓ Notification created for technician {technician.username}: {notification.id}")
        except User.DoesNotExist:
            print(f"✗ Technician with ID {technician_id} not found")
        except Exception as e:
            print(f"✗ Error creating notification: {str(e)}")
        
        return Response(self.get_serializer(maintenance_request).data)
    
    @action(detail=True, methods=['get'], permission_classes=[IsMaintenanceSupervisor])
    def suggest_technicians(self, request, pk=None):
        """Get suggested technicians for this request with full profile info."""
        from django.db.models import Count, Q, Avg
        from apps.core.feedback_models import ServiceRating

        maintenance_request = self.get_object()
        suggestions = suggest_technicians(maintenance_request, limit=20)

        result = []
        for s in suggestions:
            tech = s['technician']

            # Get rating stats
            ratings = ServiceRating.objects.filter(
                maintenance_request__assigned_to=tech
            )
            avg_rating = ratings.aggregate(avg=Avg('overall_rating'))['avg']
            total_ratings = ratings.count()

            # Determine eligibility badge
            category = maintenance_request.category
            if tech.specialization == category:
                eligibility = 'exact_match'
                eligibility_label = 'Exact Match'
            elif tech.specialization == 'GENERAL' or not tech.specialization:
                eligibility = 'general'
                eligibility_label = 'General'
            else:
                eligibility = 'other'
                eligibility_label = 'Other Specialization'

            result.append({
                'id': tech.id,
                'username': tech.username,
                'full_name': tech.get_full_name(),
                'department': tech.department or 'Maintenance',
                'specialization': tech.specialization or 'GENERAL',
                'specialization_display': dict([
                    ('ELECTRICAL', 'Electrical'),
                    ('PLUMBING', 'Plumbing'),
                    ('HVAC', 'HVAC'),
                    ('STRUCTURAL', 'Structural'),
                    ('EQUIPMENT', 'Equipment Repair'),
                    ('GENERAL', 'General Maintenance'),
                ]).get(tech.specialization, tech.specialization or 'General'),
                'assigned_campus': tech.assigned_campus or 'Any Campus',
                'score': s['score'],
                'explanation': s['explanation'],
                'active_requests': s['active_requests'],
                'performance_score': round(tech.performance_score, 1),
                'total_ratings': tech.total_ratings,
                'avg_rating': round(avg_rating, 1) if avg_rating else None,
                'eligibility': eligibility,
                'eligibility_label': eligibility_label,
                'is_available': tech.is_active,
            })

        return Response({'suggestions': result})
    
    @action(detail=True, methods=['post'], permission_classes=[IsMaintenanceSupervisor])
    def auto_assign(self, request, pk=None):
        """Manually trigger automatic assignment for a request."""
        maintenance_request = self.get_object()
        
        if maintenance_request.status not in ['SUBMITTED', 'ASSIGNED']:
            return Response(
                {'error': 'Can only auto-assign requests in SUBMITTED or ASSIGNED status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        assigned_technician = auto_assign_request(maintenance_request)
        
        if not assigned_technician:
            return Response(
                {'error': 'No suitable technician found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        maintenance_request.assigned_to = assigned_technician
        maintenance_request.status = 'ASSIGNED'
        maintenance_request.save()
        
        # Create or update work order with scheduled date and estimated hours
        WorkOrder.objects.update_or_create(
            request=maintenance_request,
            defaults=build_work_order_defaults(maintenance_request, assigned_technician.id)
        )
        
        explanation = get_routing_explanation(maintenance_request, assigned_technician)
        
        return Response({
            'message': 'Request automatically assigned',
            'assigned_to': {
                'id': assigned_technician.id,
                'username': assigned_technician.username,
                'full_name': assigned_technician.get_full_name(),
                'specialization': assigned_technician.specialization or 'General'
            },
            'explanation': explanation,
            'request': self.get_serializer(maintenance_request).data
        })


class WorkOrderViewSet(viewsets.ModelViewSet):
    queryset = WorkOrder.objects.select_related('request', 'assigned_to').all()
    serializer_class = WorkOrderSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['assigned_to']
    
    def get_permissions(self):
        # Only technicians and supervisors can update/delete
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsMaintenanceTechnician()]
        return super().get_permissions()
    
    def get_queryset(self):
        qs = super().get_queryset()
        # Technicians only see their own work orders
        if self.request.user.role == 'MAINTENANCE_TECHNICIAN':
            return qs.filter(assigned_to=self.request.user)
        # Supervisors, property managers, and admins see all
        return qs
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update work order and request status."""
        work_order = self.get_object()
        new_status = request.data.get('status')
        
        if new_status:
            work_order.request.status = new_status
            work_order.request.save()
        
        serializer = self.get_serializer(work_order, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='messages')
    def get_messages(self, request, pk=None):
        """GET messages for a work order (supervisor/manager view)."""
        from apps.maintenance.models import WorkOrderMessage
        work_order = self.get_object()

        WorkOrderMessage.objects.filter(
            work_order=work_order, is_read=False
        ).exclude(sender=request.user).update(
            is_read=True, read_at=timezone.now()
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
        """POST send a message on a work order (supervisor/manager)."""
        from apps.maintenance.models import WorkOrderMessage
        from apps.core.models import Notification

        work_order = self.get_object()
        text = request.data.get('message', '').strip()
        if not text:
            return Response({'error': 'Message cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)

        msg = WorkOrderMessage.objects.create(
            work_order=work_order,
            sender=request.user,
            message=text,
        )

        # Notify the assigned technician
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


class PreventiveMaintenanceViewSet(viewsets.ModelViewSet):
    queryset = PreventiveMaintenance.objects.select_related('asset').all()
    serializer_class = PreventiveMaintenanceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['asset', 'is_active']
