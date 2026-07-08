"""
Advanced Analytics Views for Maintenance System
Provides comprehensive analytics, SLA monitoring, and performance metrics
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Avg, Sum, Q, F, ExpressionWrapper, DurationField
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from django.utils import timezone
from datetime import timedelta, datetime
from .models import MaintenanceRequest, WorkOrder, SLATracking, RequestReassignment
from apps.users.models import User, TechnicianAvailability
from apps.core.feedback_models import ServiceRating


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sla_monitoring_dashboard(request):
    """
    Comprehensive SLA monitoring dashboard with real-time metrics
    """
    # Date range filters
    days = int(request.GET.get('days', 30))
    start_date = timezone.now() - timedelta(days=days)
    
    # Get all SLA tracking records
    sla_records = SLATracking.objects.filter(created_at__gte=start_date)
    
    # Overall SLA compliance
    total_requests = sla_records.count()
    response_met = sla_records.filter(response_met=True).count()
    resolution_met = sla_records.filter(resolution_met=True).count()
    
    response_compliance = round((response_met / total_requests * 100), 2) if total_requests > 0 else 0
    resolution_compliance = round((resolution_met / total_requests * 100), 2) if total_requests > 0 else 0
    
    # SLA by priority
    priority_sla = []
    for priority in ['EMERGENCY', 'HIGH', 'MEDIUM', 'LOW']:
        priority_records = sla_records.filter(request__priority=priority)
        priority_total = priority_records.count()
        
        if priority_total > 0:
            priority_response_met = priority_records.filter(response_met=True).count()
            priority_resolution_met = priority_records.filter(resolution_met=True).count()
            
            priority_sla.append({
                'priority': priority,
                'total': priority_total,
                'response_compliance': round((priority_response_met / priority_total * 100), 2),
                'resolution_compliance': round((priority_resolution_met / priority_total * 100), 2),
                'avg_response_delay': round(priority_records.aggregate(
                    avg=Avg('response_delay_hours'))['avg'] or 0, 2),
                'avg_resolution_delay': round(priority_records.aggregate(
                    avg=Avg('resolution_delay_hours'))['avg'] or 0, 2),
            })
    
    # Currently overdue requests
    overdue_requests = sla_records.filter(
        Q(response_time__isnull=True, response_deadline__lt=timezone.now()) |
        Q(resolution_time__isnull=True, resolution_deadline__lt=timezone.now())
    ).select_related('request', 'request__asset', 'request__assigned_to')
    
    overdue_list = []
    for sla in overdue_requests[:20]:  # Limit to 20 most critical
        hours_overdue = 0
        if not sla.response_time and sla.response_deadline < timezone.now():
            hours_overdue = (timezone.now() - sla.response_deadline).total_seconds() / 3600
        elif not sla.resolution_time and sla.resolution_deadline < timezone.now():
            hours_overdue = (timezone.now() - sla.resolution_deadline).total_seconds() / 3600
        
        overdue_list.append({
            'request_id': sla.request.request_id,
            'asset': sla.request.asset.asset_id,
            'priority': sla.request.priority,
            'status': sla.request.status,
            'assigned_to': sla.request.assigned_to.get_full_name() if sla.request.assigned_to else 'Unassigned',
            'hours_overdue': round(hours_overdue, 2),
            'created_at': sla.request.created_at.isoformat(),
        })
    
    # SLA trends (last 7 days)
    trends = []
    for i in range(6, -1, -1):
        day = timezone.now().date() - timedelta(days=i)
        day_records = sla_records.filter(created_at__date=day)
        day_total = day_records.count()
        
        if day_total > 0:
            day_response_met = day_records.filter(response_met=True).count()
            day_resolution_met = day_records.filter(resolution_met=True).count()
            
            trends.append({
                'date': day.isoformat(),
                'total': day_total,
                'response_compliance': round((day_response_met / day_total * 100), 2),
                'resolution_compliance': round((day_resolution_met / day_total * 100), 2),
            })
    
    # Escalated requests
    escalated = sla_records.filter(escalated=True).count()
    
    # Average response and resolution times
    avg_response_time = sla_records.filter(response_time__isnull=False).aggregate(
        avg=Avg(ExpressionWrapper(
            F('response_time') - F('request__created_at'),
            output_field=DurationField()
        ))
    )['avg']
    
    avg_resolution_time = sla_records.filter(resolution_time__isnull=False).aggregate(
        avg=Avg(ExpressionWrapper(
            F('resolution_time') - F('request__created_at'),
            output_field=DurationField()
        ))
    )['avg']
    
    return Response({
        'summary': {
            'total_requests': total_requests,
            'response_compliance': response_compliance,
            'resolution_compliance': resolution_compliance,
            'escalated_count': escalated,
            'overdue_count': len(overdue_list),
            'avg_response_hours': round(avg_response_time.total_seconds() / 3600, 2) if avg_response_time else 0,
            'avg_resolution_hours': round(avg_resolution_time.total_seconds() / 3600, 2) if avg_resolution_time else 0,
        },
        'priority_breakdown': priority_sla,
        'overdue_requests': overdue_list,
        'trends': trends,
        'period_days': days,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def advanced_analytics(request):
    """
    Advanced analytics with predictive insights and performance metrics
    """
    # Date range
    days = int(request.GET.get('days', 30))
    start_date = timezone.now() - timedelta(days=days)
    
    # Maintenance requests analysis
    requests = MaintenanceRequest.objects.filter(created_at__gte=start_date)
    total_requests = requests.count()
    
    # Status distribution
    status_dist = requests.values('status').annotate(count=Count('id')).order_by('-count')
    
    # Priority distribution
    priority_dist = requests.values('priority').annotate(count=Count('id')).order_by('-count')
    
    # Category distribution
    category_dist = requests.values('category').annotate(count=Count('id')).order_by('-count')
    
    # Completion rate
    completed = requests.filter(status='COMPLETED').count()
    completion_rate = round((completed / total_requests * 100), 2) if total_requests > 0 else 0
    
    # Average completion time
    completed_requests = requests.filter(status='COMPLETED', work_order__completed_at__isnull=False)
    avg_completion_time = completed_requests.aggregate(
        avg=Avg(ExpressionWrapper(
            F('work_order__completed_at') - F('created_at'),
            output_field=DurationField()
        ))
    )['avg']
    
    # Cost analysis
    work_orders = WorkOrder.objects.filter(request__created_at__gte=start_date)
    total_cost = work_orders.aggregate(total=Sum('cost_total'))['total'] or 0
    avg_cost = work_orders.aggregate(avg=Avg('cost_total'))['avg'] or 0
    
    cost_by_category = work_orders.values('request__category').annotate(
        total_cost=Sum('cost_total'),
        count=Count('id')
    ).order_by('-total_cost')
    
    # Technician performance
    technicians = User.objects.filter(role='MAINTENANCE_TECHNICIAN')
    tech_performance = []
    
    for tech in technicians:
        tech_requests = requests.filter(assigned_to=tech)
        tech_completed = tech_requests.filter(status='COMPLETED').count()
        tech_total = tech_requests.count()
        
        # Get ratings
        ratings = ServiceRating.objects.filter(maintenance_request__assigned_to=tech)
        avg_rating = ratings.aggregate(avg=Avg('overall_rating'))['avg']
        
        # Get SLA compliance
        tech_sla = SLATracking.objects.filter(request__assigned_to=tech, created_at__gte=start_date)
        tech_sla_total = tech_sla.count()
        tech_sla_met = tech_sla.filter(response_met=True, resolution_met=True).count()
        
        if tech_total > 0:
            tech_performance.append({
                'id': tech.id,
                'name': tech.get_full_name(),
                'specialization': tech.specialization or 'General',
                'total_requests': tech_total,
                'completed': tech_completed,
                'completion_rate': round((tech_completed / tech_total * 100), 2),
                'avg_rating': round(avg_rating, 2) if avg_rating else 0,
                'sla_compliance': round((tech_sla_met / tech_sla_total * 100), 2) if tech_sla_total > 0 else 0,
                'performance_score': round(tech.performance_score, 2),
            })
    
    # Sort by performance score
    tech_performance.sort(key=lambda x: x['performance_score'], reverse=True)
    
    # Request trends (daily for last 30 days)
    trends = []
    for i in range(min(days, 30) - 1, -1, -1):
        day = timezone.now().date() - timedelta(days=i)
        day_requests = requests.filter(created_at__date=day)
        
        trends.append({
            'date': day.isoformat(),
            'total': day_requests.count(),
            'emergency': day_requests.filter(priority='EMERGENCY').count(),
            'high': day_requests.filter(priority='HIGH').count(),
            'completed': day_requests.filter(status='COMPLETED').count(),
        })
    
    # Reassignment analysis
    reassignments = RequestReassignment.objects.filter(reassigned_at__gte=start_date)
    reassignment_reasons = reassignments.values('reason').annotate(count=Count('id')).order_by('-count')
    
    # Predictive insights
    insights = []
    
    # High reassignment rate
    if reassignments.count() > total_requests * 0.2:
        insights.append({
            'type': 'warning',
            'title': 'High Reassignment Rate',
            'message': f'{reassignments.count()} requests reassigned ({round(reassignments.count()/total_requests*100, 1)}%). Review workload distribution.',
        })
    
    # Low completion rate
    if completion_rate < 70:
        insights.append({
            'type': 'alert',
            'title': 'Low Completion Rate',
            'message': f'Only {completion_rate}% of requests completed. Investigate bottlenecks.',
        })
    
    # High emergency requests
    emergency_count = requests.filter(priority='EMERGENCY').count()
    if emergency_count > total_requests * 0.15:
        insights.append({
            'type': 'warning',
            'title': 'High Emergency Requests',
            'message': f'{emergency_count} emergency requests ({round(emergency_count/total_requests*100, 1)}%). Consider preventive maintenance.',
        })
    
    # Cost spike
    if days >= 60:
        recent_cost = work_orders.filter(
            request__created_at__gte=timezone.now() - timedelta(days=30)
        ).aggregate(total=Sum('cost_total'))['total'] or 0
        
        previous_cost = work_orders.filter(
            request__created_at__gte=timezone.now() - timedelta(days=60),
            request__created_at__lt=timezone.now() - timedelta(days=30)
        ).aggregate(total=Sum('cost_total'))['total'] or 0
        
        if previous_cost > 0 and recent_cost > previous_cost * 1.3:
            increase = round(((recent_cost - previous_cost) / previous_cost * 100), 1)
            insights.append({
                'type': 'alert',
                'title': 'Cost Spike Detected',
                'message': f'Maintenance costs increased by {increase}% in last 30 days.',
            })
    
    return Response({
        'summary': {
            'total_requests': total_requests,
            'completion_rate': completion_rate,
            'avg_completion_hours': round(avg_completion_time.total_seconds() / 3600, 2) if avg_completion_time else 0,
            'total_cost': float(total_cost),
            'avg_cost': float(avg_cost),
            'reassignment_count': reassignments.count(),
        },
        'distributions': {
            'status': list(status_dist),
            'priority': list(priority_dist),
            'category': list(category_dist),
        },
        'cost_analysis': {
            'by_category': list(cost_by_category),
            'total': float(total_cost),
            'average': float(avg_cost),
        },
        'technician_performance': tech_performance[:10],  # Top 10
        'trends': trends,
        'reassignment_reasons': list(reassignment_reasons),
        'insights': insights,
        'period_days': days,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def technician_availability_dashboard(request):
    """
    Comprehensive technician availability and scheduling dashboard
    """
    # Get all technicians
    technicians = User.objects.filter(role='MAINTENANCE_TECHNICIAN', is_active=True)
    
    today = timezone.now().date()
    
    # Availability summary
    availability_data = []
    
    for tech in technicians:
        # Check current availability status
        current_availability = TechnicianAvailability.objects.filter(
            technician=tech,
            start_date__lte=today,
            end_date__gte=today
        ).first()
        
        # Get active work orders
        active_work_orders = WorkOrder.objects.filter(
            assigned_to=tech,
            request__status__in=['ASSIGNED', 'IN_PROGRESS', 'WAITING_PARTS']
        ).count()
        
        # Get today's scheduled work
        today_work = WorkOrder.objects.filter(
            assigned_to=tech,
            scheduled_date__date=today
        ).count()
        
        # Calculate workload score (0-100)
        workload_score = min(active_work_orders * 10, 100)
        
        # Determine status
        if current_availability:
            status = current_availability.status
            status_label = current_availability.get_status_display()
            available = False
        else:
            status = 'AVAILABLE'
            status_label = 'Available'
            available = True
        
        # Get upcoming time off
        upcoming_time_off = TechnicianAvailability.objects.filter(
            technician=tech,
            start_date__gt=today,
            start_date__lte=today + timedelta(days=30)
        ).order_by('start_date')
        
        availability_data.append({
            'id': tech.id,
            'name': tech.get_full_name(),
            'username': tech.username,
            'specialization': tech.specialization or 'GENERAL',
            'specialization_display': dict([
                ('ELECTRICAL', 'Electrical'),
                ('PLUMBING', 'Plumbing'),
                ('HVAC', 'HVAC'),
                ('STRUCTURAL', 'Structural'),
                ('EQUIPMENT', 'Equipment Repair'),
                ('GENERAL', 'General Maintenance'),
            ]).get(tech.specialization, 'General'),
            'status': status,
            'status_label': status_label,
            'available': available,
            'active_work_orders': active_work_orders,
            'today_scheduled': today_work,
            'workload_score': workload_score,
            'performance_score': round(tech.performance_score, 1),
            'current_availability': {
                'status': current_availability.status,
                'start_date': current_availability.start_date.isoformat(),
                'end_date': current_availability.end_date.isoformat(),
                'reason': current_availability.reason,
            } if current_availability else None,
            'upcoming_time_off': [{
                'id': uto.id,
                'status': uto.status,
                'start_date': uto.start_date.isoformat(),
                'end_date': uto.end_date.isoformat(),
                'reason': uto.reason,
                'approved': uto.approved,
            } for uto in upcoming_time_off[:3]],
        })
    
    # Sort by availability and workload
    availability_data.sort(key=lambda x: (not x['available'], x['workload_score']))
    
    # Summary statistics
    total_technicians = len(availability_data)
    available_count = sum(1 for t in availability_data if t['available'])
    on_leave_count = sum(1 for t in availability_data if t['status'] in ['ON_LEAVE', 'SICK_LEAVE', 'VACATION'])
    high_workload_count = sum(1 for t in availability_data if t['workload_score'] >= 70)
    
    # Availability by specialization
    specialization_availability = {}
    for tech in availability_data:
        spec = tech['specialization']
        if spec not in specialization_availability:
            specialization_availability[spec] = {'total': 0, 'available': 0}
        specialization_availability[spec]['total'] += 1
        if tech['available']:
            specialization_availability[spec]['available'] += 1
    
    # Upcoming time off (next 30 days)
    upcoming_absences = TechnicianAvailability.objects.filter(
        start_date__gte=today,
        start_date__lte=today + timedelta(days=30)
    ).select_related('technician').order_by('start_date')
    
    absence_list = [{
        'id': absence.id,
        'technician_name': absence.technician.get_full_name(),
        'technician_id': absence.technician.id,
        'status': absence.status,
        'status_label': absence.get_status_display(),
        'start_date': absence.start_date.isoformat(),
        'end_date': absence.end_date.isoformat(),
        'days': (absence.end_date - absence.start_date).days + 1,
        'reason': absence.reason,
        'approved': absence.approved,
    } for absence in upcoming_absences]
    
    # Workload distribution
    workload_distribution = {
        'low': sum(1 for t in availability_data if t['workload_score'] < 30),
        'medium': sum(1 for t in availability_data if 30 <= t['workload_score'] < 70),
        'high': sum(1 for t in availability_data if t['workload_score'] >= 70),
    }
    
    return Response({
        'summary': {
            'total_technicians': total_technicians,
            'available': available_count,
            'on_leave': on_leave_count,
            'high_workload': high_workload_count,
            'availability_rate': round((available_count / total_technicians * 100), 2) if total_technicians > 0 else 0,
        },
        'technicians': availability_data,
        'specialization_availability': specialization_availability,
        'upcoming_absences': absence_list,
        'workload_distribution': workload_distribution,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def technician_performance_report(request):
    """
    Detailed performance report for individual technician
    """
    technician_id = request.GET.get('technician_id')
    days = int(request.GET.get('days', 30))
    
    if not technician_id:
        return Response({'error': 'technician_id is required'}, status=400)
    
    try:
        technician = User.objects.get(id=technician_id, role='MAINTENANCE_TECHNICIAN')
    except User.DoesNotExist:
        return Response({'error': 'Technician not found'}, status=404)
    
    start_date = timezone.now() - timedelta(days=days)
    
    # Get requests assigned to this technician
    requests = MaintenanceRequest.objects.filter(
        assigned_to=technician,
        created_at__gte=start_date
    )
    
    total_requests = requests.count()
    completed = requests.filter(status='COMPLETED').count()
    in_progress = requests.filter(status='IN_PROGRESS').count()
    
    # Completion rate
    completion_rate = round((completed / total_requests * 100), 2) if total_requests > 0 else 0
    
    # Average completion time
    completed_work_orders = WorkOrder.objects.filter(
        assigned_to=technician,
        completed_at__isnull=False,
        request__created_at__gte=start_date
    )
    
    avg_completion_time = completed_work_orders.aggregate(
        avg=Avg(ExpressionWrapper(
            F('completed_at') - F('request__created_at'),
            output_field=DurationField()
        ))
    )['avg']
    
    # SLA compliance
    sla_records = SLATracking.objects.filter(
        request__assigned_to=technician,
        created_at__gte=start_date
    )
    sla_total = sla_records.count()
    sla_met = sla_records.filter(response_met=True, resolution_met=True).count()
    sla_compliance = round((sla_met / sla_total * 100), 2) if sla_total > 0 else 0
    
    # Ratings
    ratings = ServiceRating.objects.filter(
        maintenance_request__assigned_to=technician,
        created_at__gte=start_date
    )
    avg_rating = ratings.aggregate(avg=Avg('overall_rating'))['avg']
    total_ratings = ratings.count()
    
    # Rating distribution
    rating_dist = {
        '5_star': ratings.filter(overall_rating=5).count(),
        '4_star': ratings.filter(overall_rating=4).count(),
        '3_star': ratings.filter(overall_rating=3).count(),
        '2_star': ratings.filter(overall_rating=2).count(),
        '1_star': ratings.filter(overall_rating=1).count(),
    }
    
    # Category breakdown
    category_breakdown = requests.values('category').annotate(
        count=Count('id'),
        completed=Count('id', filter=Q(status='COMPLETED'))
    ).order_by('-count')
    
    # Priority breakdown
    priority_breakdown = requests.values('priority').annotate(
        count=Count('id'),
        completed=Count('id', filter=Q(status='COMPLETED'))
    ).order_by('-count')
    
    # Recent work orders
    recent_work = WorkOrder.objects.filter(
        assigned_to=technician
    ).select_related('request', 'request__asset').order_by('-created_at')[:10]
    
    recent_list = [{
        'id': wo.id,
        'request_id': wo.request.request_id,
        'asset': wo.request.asset.asset_id,
        'category': wo.request.category,
        'priority': wo.request.priority,
        'status': wo.request.status,
        'created_at': wo.created_at.isoformat(),
        'completed_at': wo.completed_at.isoformat() if wo.completed_at else None,
        'cost_total': float(wo.cost_total),
    } for wo in recent_work]
    
    # Reassignments
    reassignments_from = RequestReassignment.objects.filter(
        from_technician=technician,
        reassigned_at__gte=start_date
    ).count()
    
    reassignments_to = RequestReassignment.objects.filter(
        to_technician=technician,
        reassigned_at__gte=start_date
    ).count()
    
    return Response({
        'technician': {
            'id': technician.id,
            'name': technician.get_full_name(),
            'username': technician.username,
            'specialization': technician.specialization or 'GENERAL',
            'performance_score': round(technician.performance_score, 2),
        },
        'summary': {
            'total_requests': total_requests,
            'completed': completed,
            'in_progress': in_progress,
            'completion_rate': completion_rate,
            'avg_completion_hours': round(avg_completion_time.total_seconds() / 3600, 2) if avg_completion_time else 0,
            'sla_compliance': sla_compliance,
            'avg_rating': round(avg_rating, 2) if avg_rating else 0,
            'total_ratings': total_ratings,
            'reassignments_from': reassignments_from,
            'reassignments_to': reassignments_to,
        },
        'rating_distribution': rating_dist,
        'category_breakdown': list(category_breakdown),
        'priority_breakdown': list(priority_breakdown),
        'recent_work': recent_list,
        'period_days': days,
    })
