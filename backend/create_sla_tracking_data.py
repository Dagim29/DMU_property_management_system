"""
Create sample SLA tracking data for testing
"""
import os
import django
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import timezone
from apps.maintenance.models import MaintenanceRequest, SLATracking
from apps.users.models import User

def create_sla_tracking():
    """Create SLA tracking records for existing maintenance requests"""
    
    print("Creating SLA Tracking Data...")
    print("=" * 60)
    
    # Get all maintenance requests without SLA tracking
    requests = MaintenanceRequest.objects.filter(sla_tracking__isnull=True)
    
    print(f"\nFound {requests.count()} requests without SLA tracking")
    
    created_count = 0
    
    for request in requests:
        # Define SLA hours based on priority
        sla_hours = {
            'EMERGENCY': {'response': 2, 'resolution': 24},
            'HIGH': {'response': 4, 'resolution': 72},
            'MEDIUM': {'response': 8, 'resolution': 168},
            'LOW': {'response': 24, 'resolution': 336},
        }
        
        priority_sla = sla_hours.get(request.priority, {'response': 8, 'resolution': 168})
        
        # Calculate deadlines
        response_deadline = request.created_at + timedelta(hours=priority_sla['response'])
        resolution_deadline = request.created_at + timedelta(hours=priority_sla['resolution'])
        
        # Determine if response was met
        response_time = None
        response_met = False
        response_delay_hours = 0
        
        if request.status != 'SUBMITTED':
            # Assume response happened when status changed from SUBMITTED
            # For simulation, use created_at + random hours
            import random
            response_hours = random.uniform(0.5, priority_sla['response'] * 1.5)
            response_time = request.created_at + timedelta(hours=response_hours)
            response_met = response_time <= response_deadline
            if not response_met:
                response_delay_hours = (response_time - response_deadline).total_seconds() / 3600
        
        # Determine if resolution was met
        resolution_time = None
        resolution_met = False
        resolution_delay_hours = 0
        
        if request.status == 'COMPLETED':
            # Use work order completion time if available
            if hasattr(request, 'work_order') and request.work_order.completed_at:
                resolution_time = request.work_order.completed_at
            else:
                # Simulate completion time
                import random
                resolution_hours = random.uniform(
                    priority_sla['resolution'] * 0.3,
                    priority_sla['resolution'] * 1.2
                )
                resolution_time = request.created_at + timedelta(hours=resolution_hours)
            
            resolution_met = resolution_time <= resolution_deadline
            if not resolution_met:
                resolution_delay_hours = (resolution_time - resolution_deadline).total_seconds() / 3600
        
        # Check if escalated
        escalated = request.escalated or request.auto_escalated
        escalation_reason = ""
        escalated_at = None
        escalated_to = None
        
        if escalated:
            escalation_reason = "Auto-escalated due to recurring issues" if request.auto_escalated else "Manual escalation"
            escalated_at = request.escalation_date or request.created_at + timedelta(hours=priority_sla['response'])
            # Get a supervisor
            supervisor = User.objects.filter(role='MAINTENANCE_SUPERVISOR').first()
            escalated_to = supervisor
        
        # Create SLA tracking record
        sla_tracking = SLATracking.objects.create(
            request=request,
            response_sla_hours=priority_sla['response'],
            response_deadline=response_deadline,
            response_time=response_time,
            response_met=response_met,
            response_delay_hours=response_delay_hours,
            resolution_sla_hours=priority_sla['resolution'],
            resolution_deadline=resolution_deadline,
            resolution_time=resolution_time,
            resolution_met=resolution_met,
            resolution_delay_hours=resolution_delay_hours,
            escalated=escalated,
            escalation_reason=escalation_reason,
            escalated_at=escalated_at,
            escalated_to=escalated_to,
        )
        
        created_count += 1
        
        status_icon = "✓" if response_met and (resolution_met or not resolution_time) else "✗"
        print(f"{status_icon} {request.request_id} - {request.priority} - Response: {response_met}, Resolution: {resolution_met if resolution_time else 'Pending'}")
    
    print("\n" + "=" * 60)
    print(f"✓ Created {created_count} SLA tracking records!")
    
    # Print summary
    total_sla = SLATracking.objects.count()
    response_met_count = SLATracking.objects.filter(response_met=True).count()
    resolution_met_count = SLATracking.objects.filter(resolution_met=True).count()
    escalated_count = SLATracking.objects.filter(escalated=True).count()
    
    print(f"\nSummary:")
    print(f"  Total SLA Records: {total_sla}")
    print(f"  Response SLA Met: {response_met_count} ({round(response_met_count/total_sla*100, 1)}%)")
    print(f"  Resolution SLA Met: {resolution_met_count} ({round(resolution_met_count/total_sla*100, 1)}%)")
    print(f"  Escalated: {escalated_count}")

if __name__ == '__main__':
    create_sla_tracking()
