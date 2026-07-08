"""
Test script for analytics endpoints
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from rest_framework.test import force_authenticate
from apps.maintenance.analytics_views import (
    sla_monitoring_dashboard,
    advanced_analytics,
    technician_availability_dashboard,
    technician_performance_report
)

User = get_user_model()

def test_endpoints():
    """Test all analytics endpoints"""
    factory = RequestFactory()
    
    # Get or create a test user
    user, created = User.objects.get_or_create(
        username='test_supervisor',
        defaults={
            'role': 'MAINTENANCE_SUPERVISOR',
            'email': 'supervisor@test.com',
            'first_name': 'Test',
            'last_name': 'Supervisor',
            'is_staff': True,
            'is_active': True
        }
    )
    if created:
        user.set_password('password123')
        user.save()
    
    print("Testing Analytics Endpoints...")
    print("=" * 60)
    
    # Test 1: SLA Monitoring Dashboard
    print("\n1. Testing SLA Monitoring Dashboard...")
    request = factory.get('/maintenance/analytics/sla-monitoring/?days=30')
    force_authenticate(request, user=user)
    request.user = user
    try:
        response = sla_monitoring_dashboard(request)
        print(f"   ✓ Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.data
            print(f"   ✓ Total Requests: {data['summary']['total_requests']}")
            print(f"   ✓ Response Compliance: {data['summary']['response_compliance']}%")
            print(f"   ✓ Resolution Compliance: {data['summary']['resolution_compliance']}%")
            print(f"   ✓ Overdue Count: {data['summary']['overdue_count']}")
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
    
    # Test 2: Advanced Analytics
    print("\n2. Testing Advanced Analytics...")
    request = factory.get('/maintenance/analytics/advanced/?days=30')
    force_authenticate(request, user=user)
    request.user = user
    try:
        response = advanced_analytics(request)
        print(f"   ✓ Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.data
            print(f"   ✓ Total Requests: {data['summary']['total_requests']}")
            print(f"   ✓ Completion Rate: {data['summary']['completion_rate']}%")
            print(f"   ✓ Total Cost: ETB {data['summary']['total_cost']}")
            print(f"   ✓ Insights Count: {len(data['insights'])}")
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
    
    # Test 3: Technician Availability Dashboard
    print("\n3. Testing Technician Availability Dashboard...")
    request = factory.get('/maintenance/analytics/technician-availability/')
    force_authenticate(request, user=user)
    request.user = user
    try:
        response = technician_availability_dashboard(request)
        print(f"   ✓ Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.data
            print(f"   ✓ Total Technicians: {data['summary']['total_technicians']}")
            print(f"   ✓ Available: {data['summary']['available']}")
            print(f"   ✓ On Leave: {data['summary']['on_leave']}")
            print(f"   ✓ Availability Rate: {data['summary']['availability_rate']}%")
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
    
    # Test 4: Technician Performance Report
    print("\n4. Testing Technician Performance Report...")
    # Get first technician
    technician = User.objects.filter(role='MAINTENANCE_TECHNICIAN').first()
    if technician:
        request = factory.get(f'/maintenance/analytics/technician-performance/?technician_id={technician.id}&days=30')
        force_authenticate(request, user=user)
        request.user = user
        try:
            response = technician_performance_report(request)
            print(f"   ✓ Status Code: {response.status_code}")
            if response.status_code == 200:
                data = response.data
                print(f"   ✓ Technician: {data['technician']['name']}")
                print(f"   ✓ Total Requests: {data['summary']['total_requests']}")
                print(f"   ✓ Completion Rate: {data['summary']['completion_rate']}%")
                print(f"   ✓ SLA Compliance: {data['summary']['sla_compliance']}%")
        except Exception as e:
            print(f"   ✗ Error: {str(e)}")
    else:
        print("   ⚠ No technicians found in database")
    
    print("\n" + "=" * 60)
    print("✓ All endpoint tests completed!")

if __name__ == '__main__':
    test_endpoints()
