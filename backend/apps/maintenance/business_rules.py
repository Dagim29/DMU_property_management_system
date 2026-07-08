"""
Maintenance Management Business Rules (BR-MM-01 through BR-MM-07)
"""

from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta


def enforce_owner_asset_restriction(request_data, user):
    """
    BR-MM-07: Owners can only submit requests for their assigned assets.
    """
    if user.role == 'OWNER':
        asset = request_data.get('asset')
        if asset and asset.assigned_to != user:
            raise ValidationError(
                "You can only submit maintenance requests for assets assigned to you"
            )


def check_emergency_sla(maintenance_request):
    """
    BR-MM-01: Emergency requests: 2-hour response, 24-hour resolution.
    Returns dict with SLA status.
    """
    if maintenance_request.priority != 'EMERGENCY':
        return None
    
    now = timezone.now()
    
    result = {
        'is_emergency': True,
        'response_deadline': maintenance_request.response_deadline,
        'resolution_deadline': maintenance_request.resolution_deadline,
        'response_met': maintenance_request.response_met,
        'resolution_met': maintenance_request.resolution_met,
    }
    
    # Check response SLA (2 hours)
    if maintenance_request.response_deadline:
        response_overdue = now > maintenance_request.response_deadline and maintenance_request.status == 'SUBMITTED'
        result['response_overdue'] = response_overdue
        result['response_hours_remaining'] = (maintenance_request.response_deadline - now).total_seconds() / 3600
    
    # Check resolution SLA (24 hours)
    if maintenance_request.resolution_deadline:
        resolution_overdue = now > maintenance_request.resolution_deadline and maintenance_request.status != 'COMPLETED'
        result['resolution_overdue'] = resolution_overdue
        result['resolution_hours_remaining'] = (maintenance_request.resolution_deadline - now).total_seconds() / 3600
    
    return result


def check_finance_approval_required(work_order):
    """
    BR-MM-02: Costs >50,000 ETB require Finance approval.
    Returns dict with approval status.
    """
    if work_order.cost_total <= 50000:
        return {
            'requires_approval': False,
            'cost_total': float(work_order.cost_total),
            'threshold': 50000
        }
    
    return {
        'requires_approval': True,
        'cost_total': float(work_order.cost_total),
        'threshold': 50000,
        'approved': work_order.finance_approved,
        'approved_by': work_order.finance_approved_by.get_full_name() if work_order.finance_approved_by else None,
        'approval_date': work_order.finance_approval_date,
        'can_proceed': work_order.finance_approved
    }


def enforce_finance_approval(work_order):
    """
    BR-MM-02: Enforce finance approval before completion.
    """
    if work_order.requires_finance_approval and not work_order.finance_approved:
        raise ValidationError(
            f"Finance approval required for work orders exceeding 50,000 ETB. "
            f"Current cost: {work_order.cost_total} ETB"
        )


def check_critical_equipment_delay(maintenance_request):
    """
    BR-MM-03: Critical equipment maintenance max 7-day delay.
    Returns dict with delay status.
    """
    if not maintenance_request.is_critical_equipment:
        return None
    
    now = timezone.now().date()
    
    result = {
        'is_critical': True,
        'max_delay_date': maintenance_request.max_delay_date,
        'days_remaining': (maintenance_request.max_delay_date - now).days if maintenance_request.max_delay_date else None,
    }
    
    if maintenance_request.max_delay_date:
        result['overdue'] = now > maintenance_request.max_delay_date
        result['within_limit'] = now <= maintenance_request.max_delay_date
    
    return result


def check_recurring_issues(maintenance_request):
    """
    BR-MM-04: 3+ same issues in 30 days auto-escalate to department head.
    Returns dict with escalation status.
    """
    similar_count = maintenance_request.count_similar_issues()
    
    return {
        'similar_issue_count': similar_count,
        'threshold': 3,
        'should_escalate': similar_count >= 3,
        'auto_escalated': maintenance_request.auto_escalated,
        'escalated_to_department_head': maintenance_request.escalated_to_department_head,
        'escalation_date': maintenance_request.escalation_date
    }


def validate_external_contractor(work_order):
    """
    BR-MM-05: External contractors need valid license + vendor registration.
    """
    if not work_order.uses_external_contractor:
        return True
    
    errors = []
    
    if not work_order.contractor_name:
        errors.append("Contractor name is required")
    
    if not work_order.contractor_license:
        errors.append("Contractor license number is required")
    
    if not work_order.contractor_license_valid:
        errors.append("Contractor must have a valid license")
    
    if not work_order.vendor_registered:
        errors.append("Contractor must be registered as a vendor")
    
    if errors:
        raise ValidationError("; ".join(errors))
    
    return True


def check_contractor_requirements(work_order):
    """
    BR-MM-05: Check contractor requirements status.
    Returns dict with contractor validation status.
    """
    if not work_order.uses_external_contractor:
        return {'uses_contractor': False}
    
    return {
        'uses_contractor': True,
        'contractor_name': work_order.contractor_name,
        'license_number': work_order.contractor_license,
        'license_valid': work_order.contractor_license_valid,
        'vendor_registered': work_order.vendor_registered,
        'all_requirements_met': (
            work_order.contractor_license_valid and 
            work_order.vendor_registered and 
            bool(work_order.contractor_name) and 
            bool(work_order.contractor_license)
        )
    }


def check_dual_signoff(work_order):
    """
    BR-MM-06: Completed work requires dual sign-off (supervisor + requester).
    Returns dict with sign-off status.
    """
    return {
        'supervisor_signed_off': work_order.supervisor_signed_off,
        'supervisor_signoff_by': work_order.supervisor_signoff_by.get_full_name() if work_order.supervisor_signoff_by else None,
        'supervisor_signoff_date': work_order.supervisor_signoff_date,
        'requester_signed_off': work_order.requester_signed_off,
        'requester_signoff_by': work_order.requester_signoff_by.get_full_name() if work_order.requester_signoff_by else None,
        'requester_signoff_date': work_order.requester_signoff_date,
        'fully_approved': work_order.fully_approved,
        'can_close': work_order.supervisor_signed_off and work_order.requester_signed_off
    }


def enforce_dual_signoff(work_order):
    """
    BR-MM-06: Enforce dual sign-off before closing work order.
    """
    if not work_order.supervisor_signed_off:
        raise ValidationError("Supervisor sign-off is required before closing work order")
    
    if not work_order.requester_signed_off:
        raise ValidationError("Requester sign-off is required before closing work order")


def get_maintenance_permissions(user):
    """
    Get user permissions for maintenance operations.
    """
    permissions = {
        'can_submit_request': True,
        'can_view_all_requests': False,
        'can_assign_requests': False,
        'can_approve_finance': False,
        'can_supervisor_signoff': False,
        'can_requester_signoff': False,
        'can_manage_contractors': False,
    }
    
    if user.role in ['SUPER_ADMIN', 'PROPERTY_MANAGER']:
        permissions.update({
            'can_view_all_requests': True,
            'can_assign_requests': True,
            'can_approve_finance': True,
            'can_supervisor_signoff': True,
            'can_manage_contractors': True,
        })
    elif user.role == 'MAINTENANCE_SUPERVISOR':
        permissions.update({
            'can_view_all_requests': True,
            'can_assign_requests': True,
            'can_supervisor_signoff': True,
        })
    elif user.role == 'FINANCE_MANAGER':
        permissions.update({
            'can_view_all_requests': True,
            'can_approve_finance': True,
        })
    
    return permissions


def check_all_maintenance_rules(maintenance_request, work_order=None):
    """
    Check all maintenance business rules for a request.
    Returns comprehensive status dict.
    """
    rules = []
    
    # BR-MM-01: Emergency SLA
    emergency_status = check_emergency_sla(maintenance_request)
    if emergency_status:
        rules.append({
            'rule': 'BR-MM-01',
            'name': 'Emergency Response SLA',
            'status': 'OK' if not emergency_status.get('response_overdue') else 'OVERDUE',
            'details': emergency_status
        })
    
    # BR-MM-03: Critical Equipment
    critical_status = check_critical_equipment_delay(maintenance_request)
    if critical_status:
        rules.append({
            'rule': 'BR-MM-03',
            'name': 'Critical Equipment Delay',
            'status': 'OK' if critical_status.get('within_limit') else 'OVERDUE',
            'details': critical_status
        })
    
    # BR-MM-04: Recurring Issues
    recurring_status = check_recurring_issues(maintenance_request)
    rules.append({
        'rule': 'BR-MM-04',
        'name': 'Recurring Issue Escalation',
        'status': 'ESCALATED' if recurring_status['auto_escalated'] else 'OK',
        'details': recurring_status
    })
    
    if work_order:
        # BR-MM-02: Finance Approval
        finance_status = check_finance_approval_required(work_order)
        if finance_status['requires_approval']:
            rules.append({
                'rule': 'BR-MM-02',
                'name': 'Finance Approval',
                'status': 'APPROVED' if finance_status['approved'] else 'PENDING',
                'details': finance_status
            })
        
        # BR-MM-05: Contractor Requirements
        contractor_status = check_contractor_requirements(work_order)
        if contractor_status['uses_contractor']:
            rules.append({
                'rule': 'BR-MM-05',
                'name': 'Contractor Requirements',
                'status': 'OK' if contractor_status['all_requirements_met'] else 'INCOMPLETE',
                'details': contractor_status
            })
        
        # BR-MM-06: Dual Sign-off
        signoff_status = check_dual_signoff(work_order)
        rules.append({
            'rule': 'BR-MM-06',
            'name': 'Dual Sign-off',
            'status': 'COMPLETE' if signoff_status['fully_approved'] else 'PENDING',
            'details': signoff_status
        })
    
    return {
        'request_id': maintenance_request.request_id,
        'rules_checked': len(rules),
        'rules': rules
    }
