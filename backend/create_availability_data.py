"""
Create sample technician availability and shift data
"""
import os
import django
from datetime import timedelta, time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import timezone
from apps.users.models import User, TechnicianAvailability, TechnicianShift
import random

def create_availability_data():
    """Create sample availability and shift records"""
    
    print("Creating Technician Availability Data...")
    print("=" * 60)
    
    # Get all technicians
    technicians = User.objects.filter(role='MAINTENANCE_TECHNICIAN')
    
    print(f"\nFound {technicians.count()} technicians")
    
    # Get a supervisor for approvals
    supervisor = User.objects.filter(role='MAINTENANCE_SUPERVISOR').first()
    
    if not supervisor:
        print("⚠ No supervisor found. Creating one...")
        supervisor = User.objects.create_user(
            username='supervisor_test',
            email='supervisor@test.com',
            password='password123',
            first_name='Test',
            last_name='Supervisor',
            role='MAINTENANCE_SUPERVISOR'
        )
    
    # Create some availability records
    availability_count = 0
    shift_count = 0
    
    today = timezone.now().date()
    
    # Create past, current, and future availability records
    for i, tech in enumerate(technicians[:5]):  # First 5 technicians
        
        # 1. Past vacation (approved)
        if i % 3 == 0:
            past_start = today - timedelta(days=random.randint(20, 40))
            past_end = past_start + timedelta(days=random.randint(3, 7))
            
            avail = TechnicianAvailability.objects.create(
                technician=tech,
                status='VACATION',
                start_date=past_start,
                end_date=past_end,
                reason='Annual vacation',
                notes='Approved vacation time',
                approved=True,
                approved_by=supervisor,
                approved_at=timezone.now() - timedelta(days=random.randint(25, 45))
            )
            availability_count += 1
            print(f"✓ Created past vacation for {tech.get_full_name()}")
        
        # 2. Current leave (some approved, some pending)
        if i % 4 == 0:
            current_start = today - timedelta(days=random.randint(1, 3))
            current_end = today + timedelta(days=random.randint(2, 5))
            
            is_approved = random.choice([True, False])
            
            avail = TechnicianAvailability.objects.create(
                technician=tech,
                status=random.choice(['ON_LEAVE', 'SICK_LEAVE']),
                start_date=current_start,
                end_date=current_end,
                reason='Medical appointment' if random.random() > 0.5 else 'Personal leave',
                notes='Currently on leave',
                approved=is_approved,
                approved_by=supervisor if is_approved else None,
                approved_at=timezone.now() - timedelta(days=1) if is_approved else None
            )
            availability_count += 1
            status = "approved" if is_approved else "pending"
            print(f"✓ Created current leave for {tech.get_full_name()} ({status})")
        
        # 3. Future time off requests
        if i % 2 == 0:
            future_start = today + timedelta(days=random.randint(7, 30))
            future_end = future_start + timedelta(days=random.randint(2, 10))
            
            is_approved = random.choice([True, False, False])  # More pending than approved
            
            avail = TechnicianAvailability.objects.create(
                technician=tech,
                status=random.choice(['VACATION', 'TRAINING', 'ON_LEAVE']),
                start_date=future_start,
                end_date=future_end,
                reason=random.choice([
                    'Planned vacation',
                    'Professional training',
                    'Family event',
                    'Medical procedure'
                ]),
                notes='Future time off request',
                approved=is_approved,
                approved_by=supervisor if is_approved else None,
                approved_at=timezone.now() if is_approved else None
            )
            availability_count += 1
            status = "approved" if is_approved else "pending approval"
            print(f"✓ Created future time off for {tech.get_full_name()} ({status})")
    
    print(f"\n✓ Created {availability_count} availability records")
    
    # Create shift schedules for all technicians
    print("\nCreating shift schedules...")
    
    days_of_week = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
    
    shift_patterns = [
        # Full-time weekday schedule
        {
            'days': ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
            'shift_type': 'FULL_DAY',
            'start_time': time(8, 0),
            'end_time': time(17, 0)
        },
        # Morning shift
        {
            'days': ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
            'shift_type': 'MORNING',
            'start_time': time(8, 0),
            'end_time': time(16, 0)
        },
        # Afternoon shift
        {
            'days': ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
            'shift_type': 'AFTERNOON',
            'start_time': time(12, 0),
            'end_time': time(20, 0)
        },
    ]
    
    for i, tech in enumerate(technicians):
        # Assign a shift pattern
        pattern = shift_patterns[i % len(shift_patterns)]
        
        for day in pattern['days']:
            # Check if shift already exists
            existing = TechnicianShift.objects.filter(
                technician=tech,
                day_of_week=day
            ).first()
            
            if not existing:
                shift = TechnicianShift.objects.create(
                    technician=tech,
                    day_of_week=day,
                    shift_type=pattern['shift_type'],
                    start_time=pattern['start_time'],
                    end_time=pattern['end_time'],
                    is_active=True
                )
                shift_count += 1
        
        print(f"✓ Created shifts for {tech.get_full_name()} - {pattern['shift_type']}")
    
    print(f"\n✓ Created {shift_count} shift records")
    
    print("\n" + "=" * 60)
    print("✓ Availability and shift data creation complete!")
    
    # Print summary
    total_avail = TechnicianAvailability.objects.count()
    approved_avail = TechnicianAvailability.objects.filter(approved=True).count()
    pending_avail = TechnicianAvailability.objects.filter(approved=False).count()
    active_avail = TechnicianAvailability.objects.filter(
        start_date__lte=today,
        end_date__gte=today
    ).count()
    
    total_shifts = TechnicianShift.objects.count()
    active_shifts = TechnicianShift.objects.filter(is_active=True).count()
    
    print(f"\nSummary:")
    print(f"  Total Availability Records: {total_avail}")
    print(f"  Approved: {approved_avail}")
    print(f"  Pending: {pending_avail}")
    print(f"  Currently Active: {active_avail}")
    print(f"  Total Shifts: {total_shifts}")
    print(f"  Active Shifts: {active_shifts}")

if __name__ == '__main__':
    create_availability_data()
