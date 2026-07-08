"""
Report generation logic for BR-RC-01 through BR-RC-04
"""

from datetime import timedelta, datetime, date
from decimal import Decimal
from django.db.models import Count, Sum, Avg, Q, F
from django.utils import timezone
from apps.assets.models import Asset
from apps.maintenance.models import MaintenanceRequest, WorkOrder
from .models import MaintenanceMetrics


def convert_decimals_to_float(data):
    """Convert all Decimal values in nested dict/list to float for JSON serialization."""
    if isinstance(data, dict):
        return {k: convert_decimals_to_float(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [convert_decimals_to_float(item) for item in data]
    elif isinstance(data, Decimal):
        return float(data)
    return data


def calculate_maintenance_metrics(period_start, period_end):
    """
    BR-RC-03: Calculate MTTR, First-Time Fix Rate, Cost Per Repair
    """
    from django.utils import timezone as tz
    
    # Convert dates to timezone-aware datetimes
    if isinstance(period_start, date) and not isinstance(period_start, datetime):
        period_start = tz.make_aware(datetime.combine(period_start, datetime.min.time()))
    if isinstance(period_end, date) and not isinstance(period_end, datetime):
        period_end = tz.make_aware(datetime.combine(period_end, datetime.max.time()))
    
    # Get completed work orders in period
    work_orders = WorkOrder.objects.filter(
        completed_at__gte=period_start,
        completed_at__lte=period_end,
        request__status='COMPLETED'
    ).select_related('request')
    
    total_requests = work_orders.count()
    
    if total_requests == 0:
        return {
            'mean_time_to_repair': float(0.00),
            'first_time_fix_rate': float(0.00),
            'cost_per_repair': float(0.00),
            'total_requests': 0,
            'completed_requests': 0,
            'total_cost': float(0.00)
        }
    
    # Calculate MTTR (Mean Time To Repair) in hours
    total_repair_time = timedelta()
    first_time_fixes = 0
    total_cost = Decimal('0.00')
    
    for wo in work_orders:
        if wo.started_at and wo.completed_at:
            repair_time = wo.completed_at - wo.started_at
            total_repair_time += repair_time
        
        # Check if first-time fix (no previous requests for same asset/category in last 7 days)
        seven_days_before = wo.request.created_at - timedelta(days=7)
        previous_requests = MaintenanceRequest.objects.filter(
            asset=wo.request.asset,
            category=wo.request.category,
            created_at__gte=seven_days_before,
            created_at__lt=wo.request.created_at
        ).count()
        
        if previous_requests == 0:
            first_time_fixes += 1
        
        total_cost += wo.cost_total
    
    # Calculate metrics
    avg_repair_hours = total_repair_time.total_seconds() / 3600 / total_requests
    first_time_fix_rate = (first_time_fixes / total_requests) * 100
    cost_per_repair = total_cost / total_requests
    
    return {
        'mean_time_to_repair': float(round(avg_repair_hours, 2)),
        'first_time_fix_rate': float(round(first_time_fix_rate, 2)),
        'cost_per_repair': float(round(cost_per_repair, 2)),
        'total_requests': total_requests,
        'completed_requests': total_requests,
        'total_cost': float(total_cost)
    }


def calculate_metrics_by_category(period_start, period_end):
    """Calculate metrics broken down by maintenance category."""
    categories = MaintenanceRequest.CATEGORY_CHOICES
    metrics_by_category = {}
    
    for category_code, category_name in categories:
        work_orders = WorkOrder.objects.filter(
            completed_at__gte=period_start,
            completed_at__lte=period_end,
            request__status='COMPLETED',
            request__category=category_code
        )
        
        count = work_orders.count()
        if count > 0:
            total_cost = work_orders.aggregate(Sum('cost_total'))['cost_total__sum'] or 0
            avg_cost = total_cost / count
            
            metrics_by_category[category_code] = {
                'name': category_name,
                'count': count,
                'total_cost': float(total_cost),
                'avg_cost': float(avg_cost)
            }
    
    return metrics_by_category


def calculate_metrics_by_priority(period_start, period_end):
    """Calculate metrics broken down by priority level."""
    priorities = MaintenanceRequest.PRIORITY_CHOICES
    metrics_by_priority = {}
    
    for priority_code, priority_name in priorities:
        requests = MaintenanceRequest.objects.filter(
            created_at__gte=period_start,
            created_at__lte=period_end,
            priority=priority_code
        )
        
        count = requests.count()
        completed = requests.filter(status='COMPLETED').count()
        overdue = requests.filter(escalated=True).count()
        
        if count > 0:
            completion_rate = (completed / count) * 100
            
            metrics_by_priority[priority_code] = {
                'name': priority_name,
                'count': count,
                'completed': completed,
                'overdue': overdue,
                'completion_rate': round(completion_rate, 2)
            }
    
    return metrics_by_priority


def generate_monthly_asset_report(period_start, period_end):
    """
    BR-RC-01: Generate monthly asset report
    """
    # Asset counts by status
    assets_by_status = dict(
        Asset.objects.values('status').annotate(
            count=Count('id')
        ).values_list('status', 'count')
    )
    
    # Asset counts by type
    assets_by_type = dict(
        Asset.objects.values('asset_type').annotate(
            count=Count('id')
        ).values_list('asset_type', 'count')
    )
    
    # Asset counts by campus
    assets_by_campus = list(
        Asset.objects.values('campus__name').annotate(
            count=Count('id'),
            total_value=Sum('current_value')
        ).values('campus__name', 'count', 'total_value')
    )
    # Convert Decimals to floats
    assets_by_campus = convert_decimals_to_float(assets_by_campus)
    
    # New assets in period
    new_assets = Asset.objects.filter(
        purchase_date__gte=period_start,
        purchase_date__lte=period_end
    ).count()
    
    # High-value assets
    high_value_assets = Asset.objects.filter(is_high_value=True).count()
    high_value_overdue = Asset.objects.filter(
        is_high_value=True,
        registration_overdue=True
    ).count()
    
    # Assets needing verification
    assets_needing_verification = Asset.objects.filter(
        Q(next_verification_date__lte=timezone.now().date()) |
        Q(verification_status='PENDING')
    ).count()
    
    # Total asset value
    total_value = Asset.objects.aggregate(
        Sum('current_value')
    )['current_value__sum'] or 0
    
    return {
        'summary': {
            'total_assets': Asset.objects.count(),
            'new_assets_this_period': new_assets,
            'total_asset_value': float(total_value),
            'high_value_assets': high_value_assets,
            'high_value_overdue_registration': high_value_overdue,
            'assets_needing_verification': assets_needing_verification
        },
        'by_status': assets_by_status,
        'by_type': assets_by_type,
        'by_campus': assets_by_campus
    }


def generate_maintenance_cost_report(period_start, period_end):
    """
    Generate maintenance cost analysis report
    """
    # Total maintenance costs
    work_orders = WorkOrder.objects.filter(
        created_at__gte=period_start,
        created_at__lte=period_end
    )
    
    total_cost = work_orders.aggregate(Sum('cost_total'))['cost_total__sum'] or 0
    total_labor = work_orders.aggregate(Sum('cost_labor'))['cost_labor__sum'] or 0
    total_materials = work_orders.aggregate(Sum('cost_materials'))['cost_materials__sum'] or 0
    
    # Costs by category
    costs_by_category = list(
        work_orders.values('request__category').annotate(
            total=Sum('cost_total'),
            count=Count('id')
        ).values('request__category', 'total', 'count')
    )
    # Convert Decimals to floats
    costs_by_category = convert_decimals_to_float(costs_by_category)
    
    # High-cost work orders (>50,000 ETB)
    high_cost_orders = work_orders.filter(cost_total__gt=50000).count()
    finance_approved = work_orders.filter(
        requires_finance_approval=True,
        finance_approved=True
    ).count()
    
    # External contractor costs
    contractor_costs = work_orders.filter(
        uses_external_contractor=True
    ).aggregate(Sum('cost_total'))['cost_total__sum'] or 0
    
    return {
        'summary': {
            'total_cost': float(total_cost),
            'total_labor_cost': float(total_labor),
            'total_materials_cost': float(total_materials),
            'total_work_orders': work_orders.count(),
            'high_cost_orders': high_cost_orders,
            'finance_approved_orders': finance_approved,
            'external_contractor_cost': float(contractor_costs)
        },
        'by_category': costs_by_category
    }


def generate_asset_utilization_report(period_start, period_end):
    """
    Generate asset utilization report
    """
    from apps.assets.models import AssetCheckout
    
    # Checkout statistics
    checkouts = AssetCheckout.objects.filter(
        checkout_date__gte=period_start,
        checkout_date__lte=period_end
    )
    
    total_checkouts = checkouts.count()
    active_checkouts = checkouts.filter(actual_return_date__isnull=True).count()
    overdue_checkouts = checkouts.filter(
        actual_return_date__isnull=True,
        expected_return_date__lt=timezone.now().date()
    ).count()
    
    # Most checked out assets
    most_checked_out = list(
        checkouts.values('asset__asset_id', 'asset__name').annotate(
            checkout_count=Count('id')
        ).order_by('-checkout_count')[:10]
    )
    
    return {
        'summary': {
            'total_checkouts': total_checkouts,
            'active_checkouts': active_checkouts,
            'overdue_checkouts': overdue_checkouts
        },
        'most_checked_out_assets': most_checked_out
    }


def generate_preventive_compliance_report(period_start, period_end):
    """
    Generate preventive maintenance compliance report.
    Compares scheduled vs completed preventive maintenance within the period.
    """
    from apps.maintenance.models import PreventiveMaintenance
    from django.db.models import Count

    today = timezone.now().date()

    # All active PM schedules
    all_schedules = PreventiveMaintenance.objects.filter(is_active=True).select_related('asset')
    total_schedules = all_schedules.count()

    # Schedules due within the period
    due_in_period = all_schedules.filter(
        next_due_date__gte=period_start,
        next_due_date__lte=period_end
    )
    scheduled_count = due_in_period.count()

    # Overdue (past due, not yet done – next_due_date < today)
    overdue_qs = all_schedules.filter(next_due_date__lt=today)
    overdue_count = overdue_qs.count()

    # Due soon (next 30 days, after today)
    from datetime import timedelta
    soon_cutoff = today + timedelta(days=30)
    upcoming_count = all_schedules.filter(
        next_due_date__gte=today,
        next_due_date__lte=soon_cutoff
    ).count()

    # Compliance rate: non-overdue / total
    compliance_rate = 0.0
    if total_schedules > 0:
        on_track = total_schedules - overdue_count
        compliance_rate = round((on_track / total_schedules) * 100, 2)

    # Per-asset-type breakdown
    by_asset_type = {}
    for ps in all_schedules.select_related('asset'):
        atype = ps.asset.asset_type or 'Unknown'
        if atype not in by_asset_type:
            by_asset_type[atype] = {'total': 0, 'overdue': 0, 'upcoming': 0}
        by_asset_type[atype]['total'] += 1
        if ps.next_due_date < today:
            by_asset_type[atype]['overdue'] += 1
        elif ps.next_due_date <= soon_cutoff:
            by_asset_type[atype]['upcoming'] += 1

    # Compute compliance per asset type
    by_asset_type_list = []
    for atype, counts in by_asset_type.items():
        t = counts['total']
        on_t = t - counts['overdue']
        rate = round((on_t / t) * 100, 1) if t > 0 else 0.0
        by_asset_type_list.append({
            'asset_type': atype,
            'total': t,
            'overdue': counts['overdue'],
            'upcoming': counts['upcoming'],
            'compliance_rate': rate
        })
    by_asset_type_list.sort(key=lambda x: x['compliance_rate'])

    # Overdue items list (up to 20 worst)
    overdue_items = []
    for ps in overdue_qs.select_related('asset').order_by('next_due_date')[:20]:
        days_overdue = (today - ps.next_due_date).days
        overdue_items.append({
            'asset_id':    ps.asset.asset_id,
            'asset_name':  ps.asset.name,
            'asset_type':  ps.asset.asset_type,
            'description': ps.description,
            'due_date':    ps.next_due_date.isoformat(),
            'days_overdue': days_overdue,
            'interval_days': ps.interval_days,
            'assigned_team': ps.assigned_team or 'Unassigned'
        })

    # Upcoming items list (next 30 days)
    upcoming_items = []
    for ps in all_schedules.filter(
        next_due_date__gte=today, next_due_date__lte=soon_cutoff
    ).select_related('asset').order_by('next_due_date')[:20]:
        days_until = (ps.next_due_date - today).days
        upcoming_items.append({
            'asset_id':    ps.asset.asset_id,
            'asset_name':  ps.asset.name,
            'asset_type':  ps.asset.asset_type,
            'description': ps.description,
            'due_date':    ps.next_due_date.isoformat(),
            'days_until':  days_until,
            'interval_days': ps.interval_days,
            'assigned_team': ps.assigned_team or 'Unassigned'
        })

    return {
        'summary': {
            'total_active_schedules': total_schedules,
            'scheduled_in_period':    scheduled_count,
            'overdue_schedules':      overdue_count,
            'upcoming_30_days':       upcoming_count,
            'compliance_rate':        compliance_rate,
            'on_track':               total_schedules - overdue_count
        },
        'by_asset_type': by_asset_type_list,
        'overdue_items':  overdue_items,
        'upcoming_items': upcoming_items
    }


def generate_audit_trail_report(period_start, period_end):
    """
    Generate audit trail report
    """
    from apps.core.models import AuditLog
    
    # Audit log statistics
    logs = AuditLog.objects.filter(
        timestamp__gte=period_start,
        timestamp__lte=period_end
    )
    
    total_actions = logs.count()
    
    # Actions by type
    actions_by_type = dict(
        logs.values('action').annotate(
            count=Count('id')
        ).values_list('action', 'count')
    )
    
    # Actions by user role
    actions_by_role = list(
        logs.values('user__role').annotate(
            count=Count('id')
        ).values('user__role', 'count')
    )
    
    # Most active users
    most_active_users = list(
        logs.values('user__email', 'user__first_name', 'user__last_name').annotate(
            action_count=Count('id')
        ).order_by('-action_count')[:10]
    )
    
    return {
        'summary': {
            'total_actions': total_actions
        },
        'by_action_type': actions_by_type,
        'by_user_role': actions_by_role,
        'most_active_users': most_active_users
    }


def generate_report(report_type, period_start, period_end, parameters=None):
    """
    Main report generation function
    """
    parameters = parameters or {}
    
    # Generate report data based on type
    if report_type == 'MONTHLY_ASSET':
        data = generate_monthly_asset_report(period_start, period_end)
    elif report_type == 'MAINTENANCE_COST':
        data = generate_maintenance_cost_report(period_start, period_end)
    elif report_type == 'ASSET_UTILIZATION':
        data = generate_asset_utilization_report(period_start, period_end)
    elif report_type == 'PREVENTIVE_COMPLIANCE':
        data = generate_preventive_compliance_report(period_start, period_end)
    elif report_type == 'AUDIT_TRAIL':
        data = generate_audit_trail_report(period_start, period_end)
    elif report_type == 'ASSET_STATUS':
        data = generate_monthly_asset_report(period_start, period_end)
    else:
        data = {}
    
    # Calculate maintenance metrics (BR-RC-03)
    metrics = calculate_maintenance_metrics(period_start, period_end)
    metrics['by_category'] = calculate_metrics_by_category(period_start, period_end)
    metrics['by_priority'] = calculate_metrics_by_priority(period_start, period_end)
    
    return {
        'data': data,
        'metrics': metrics
    }
