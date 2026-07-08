from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Count, Avg, Q, F
from datetime import timedelta, datetime

from .models import RequestReassignment, SLATracking, MaintenanceRequest
from .reassignment_serializers import (
    RequestReassignmentSerializer,
    SLATrackingSerializer,
    SLADashboardSerializer
)
from apps.core.models import Notification


class RequestReassignmentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing request reassignments."""
    queryset = RequestReassignment.objects.all()
    serializer_class = RequestReassignmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by request
        request_id = self.request.query_params.get('request')
        if request_id:
            queryset = queryset.filter(request_id=request_id)
        
        # Filter by technician
        technician_id = self.request.query_params.get('technician')
        if technician_id:
            queryset = queryset.filter(
                Q(from_technician_id=technician_id) | Q(to_technician_id=technician_id)
            )
        
        return queryset
    
    def perform_create(self, serializer):
        """Create reassignment and update request."""
        reassignment = serializer.save(reassigned_by=self.request.user)
        
        # Update the maintenance request
        request = reassignment.request
        request.assigned_to = reassignment.to_technician
        request.save()
        
        # Create notifications
        if reassignment.from_technician:
            Notification.objects.create(
                user=reassignment.from_technician,
                title='Request Reassigned',
                message=f'Request {request.request_id} has been reassigned to {reassignment.to_technician.get_full_name()}',
                notification_type='ASSIGNMENT',
                related_object_type='maintenance_request',
                related_object_id=request.id
            )
        
        if reassignment.to_technician:
            Notification.objects.create(
                user=reassignment.to_technician,
                title='New Request Assigned',
                message=f'Request {request.request_id} has been assigned to you',
                notification_type='ASSIGNMENT',
                related_object_type='maintenance_request',
                related_object_id=request.id
            )
    
    @action(detail=False, methods=['post'])
    def bulk_reassign(self, request):
        """Bulk reassign multiple requests."""
        request_ids = request.data.get('request_ids', [])
        to_technician_id = request.data.get('to_technician')
        reason = request.data.get('reason', 'WORKLOAD')
        notes = request.data.get('notes', '')
        
        if not request_ids or not to_technician_id:
            return Response(
                {'error': 'request_ids and to_technician are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reassignments = []
        for req_id in request_ids:
            try:
                maint_request = MaintenanceRequest.objects.get(id=req_id)
                reassignment = RequestReassignment.objects.create(
                    request=maint_request,
                    from_technician=maint_request.assigned_to,
                    to_technician_id=to_technician_id,
                    reassigned_by=request.user,
                    reason=reason,
                    notes=notes
                )
                
                # Update request
                maint_request.assigned_to_id = to_technician_id
                maint_request.save()
                
                reassignments.append(reassignment)
            except MaintenanceRequest.DoesNotExist:
                continue
        
        serializer = self.get_serializer(reassignments, many=True)
        return Response({
            'count': len(reassignments),
            'reassignments': serializer.data
        })


class SLATrackingViewSet(viewsets.ModelViewSet):
    """ViewSet for SLA tracking and monitoring."""
    queryset = SLATracking.objects.all()
    serializer_class = SLATrackingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by status
        sla_status = self.request.query_params.get('status')
        if sla_status == 'overdue':
            now = timezone.now()
            queryset = queryset.filter(
                Q(response_time__isnull=True, response_deadline__lt=now) |
                Q(resolution_time__isnull=True, resolution_deadline__lt=now)
            )
        elif sla_status == 'escalated':
            queryset = queryset.filter(escalated=True)
        elif sla_status == 'completed':
            queryset = queryset.filter(resolution_time__isnull=False)
        
        # Filter by priority
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(request__priority=priority)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get SLA dashboard statistics."""
        # Date range filter
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        queryset = SLATracking.objects.filter(created_at__gte=start_date)
        
        total = queryset.count()
        now = timezone.now()
        
        # Count by status
        overdue = queryset.filter(
            Q(response_time__isnull=True, response_deadline__lt=now) |
            Q(resolution_time__isnull=True, resolution_deadline__lt=now)
        ).count()
        
        escalated = queryset.filter(escalated=True).count()
        completed = queryset.filter(resolution_time__isnull=False).count()
        on_track = total - overdue - escalated - completed
        
        # SLA compliance
        response_met = queryset.filter(response_met=True).count()
        resolution_met = queryset.filter(resolution_met=True).count()
        
        # Average times (in hours)
        avg_response = queryset.filter(response_time__isnull=False).aggregate(
            avg=Avg(F('response_time') - F('created_at'))
        )['avg']
        avg_response_hours = avg_response.total_seconds() / 3600 if avg_response else 0
        
        avg_resolution = queryset.filter(resolution_time__isnull=False).aggregate(
            avg=Avg(F('resolution_time') - F('created_at'))
        )['avg']
        avg_resolution_hours = avg_resolution.total_seconds() / 3600 if avg_resolution else 0
        
        # Compliance rate
        compliance_rate = (resolution_met / total * 100) if total > 0 else 0
        
        data = {
            'total_requests': total,
            'on_track': on_track,
            'overdue': overdue,
            'escalated': escalated,
            'completed': completed,
            'response_sla_met': response_met,
            'resolution_sla_met': resolution_met,
            'avg_response_time': round(avg_response_hours, 2),
            'avg_resolution_time': round(avg_resolution_hours, 2),
            'compliance_rate': round(compliance_rate, 2)
        }
        
        serializer = SLADashboardSerializer(data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue_requests(self, request):
        """Get all overdue requests."""
        now = timezone.now()
        overdue = SLATracking.objects.filter(
            Q(response_time__isnull=True, response_deadline__lt=now) |
            Q(resolution_time__isnull=True, resolution_deadline__lt=now)
        ).select_related('request', 'request__asset', 'request__assigned_to')
        
        serializer = self.get_serializer(overdue, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def escalate(self, request, pk=None):
        """Escalate a request."""
        sla_tracking = self.get_object()
        escalated_to_id = request.data.get('escalated_to')
        escalation_reason = request.data.get('reason', '')
        
        if not escalated_to_id:
            return Response(
                {'error': 'escalated_to is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        sla_tracking.escalated = True
        sla_tracking.escalation_reason = escalation_reason
        sla_tracking.escalated_at = timezone.now()
        sla_tracking.escalated_to_id = escalated_to_id
        sla_tracking.save()
        
        # Create notification
        Notification.objects.create(
            user_id=escalated_to_id,
            title='Request Escalated',
            message=f'Request {sla_tracking.request.request_id} has been escalated to you',
            notification_type='ESCALATION',
            related_object_type='maintenance_request',
            related_object_id=sla_tracking.request.id
        )
        
        serializer = self.get_serializer(sla_tracking)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def compliance_report(self, request):
        """Get SLA compliance report by priority."""
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        priorities = ['EMERGENCY', 'HIGH', 'MEDIUM', 'LOW']
        report = []
        
        for priority in priorities:
            queryset = SLATracking.objects.filter(
                created_at__gte=start_date,
                request__priority=priority
            )
            
            total = queryset.count()
            if total == 0:
                continue
            
            response_met = queryset.filter(response_met=True).count()
            resolution_met = queryset.filter(resolution_met=True).count()
            
            report.append({
                'priority': priority,
                'total': total,
                'response_met': response_met,
                'resolution_met': resolution_met,
                'response_compliance': round((response_met / total * 100), 2),
                'resolution_compliance': round((resolution_met / total * 100), 2)
            })
        
        return Response(report)
