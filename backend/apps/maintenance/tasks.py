from celery import shared_task
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from .models import MaintenanceRequest, PreventiveMaintenance, WorkOrder


@shared_task
def check_sla_escalation():
    """Check for overdue maintenance requests and send escalation emails."""
    now = timezone.now()
    
    for request in MaintenanceRequest.objects.filter(
        status__in=['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS'],
        escalated=False
    ):
        deadline = request.get_sla_deadline()
        warning_time = deadline - (deadline - request.created_at) * (1 - settings.SLA_WARNING_THRESHOLD)
        
        if now >= deadline:
            # Overdue - escalate
            request.escalated = True
            request.escalation_date = now
            request.save()
            
            # Send email to supervisor
            send_escalation_email(request, is_overdue=True)
        
        elif now >= warning_time and not request.escalated:
            # Warning threshold reached
            send_escalation_email(request, is_overdue=False)


def send_escalation_email(request, is_overdue=False):
    """Send escalation email notification."""
    subject = f"{'OVERDUE' if is_overdue else 'WARNING'}: Maintenance Request {request.request_id}"
    message = f"""
    Maintenance Request: {request.request_id}
    Asset: {request.asset.asset_id}
    Priority: {request.priority}
    Status: {request.status}
    Created: {request.created_at}
    
    {'This request is now OVERDUE.' if is_overdue else 'This request is approaching its SLA deadline.'}
    """
    
    # Send to supervisors
    from apps.users.models import User
    supervisors = User.objects.filter(role='MAINTENANCE_SUPERVISOR', is_active=True)
    recipient_list = [s.email for s in supervisors if s.email]
    
    if recipient_list:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, recipient_list)


@shared_task
def create_preventive_work_orders():
    """Create work orders for due preventive maintenance tasks."""
    today = timezone.now().date()
    
    due_tasks = PreventiveMaintenance.objects.filter(
        is_active=True,
        next_due_date__lte=today
    )
    
    for task in due_tasks:
        # Create maintenance request
        request = MaintenanceRequest.objects.create(
            asset=task.asset,
            requested_by=None,  # System generated
            category='OTHER',
            priority='MEDIUM',
            description=f"Preventive Maintenance: {task.description}",
            status='SUBMITTED'
        )
        
        # Update next due date
        task.update_next_due_date()
        
        # Notify supervisor
        send_mail(
            f"Preventive Maintenance Due: {task.asset.asset_id}",
            f"A preventive maintenance task is due for {task.asset.asset_id}.\nRequest ID: {request.request_id}",
            settings.DEFAULT_FROM_EMAIL,
            [settings.DEFAULT_FROM_EMAIL]  # Configure supervisor emails
        )
