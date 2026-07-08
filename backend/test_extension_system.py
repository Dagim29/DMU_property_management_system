"""
Test script for Assignment Extension System
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.assets.assignment_models import AssetAssignmentRequest
from apps.assets.extension_models import AssignmentExtensionRequest
from datetime import date, timedelta

User = get_user_model()

def test_extension_system():
    print("=" * 60)
    print("TESTING ASSIGNMENT EXTENSION SYSTEM")
    print("=" * 60)
    
    # Get active assignments
    active_assignments = AssetAssignmentRequest.objects.filter(status='ACTIVE')
    print(f"\n✓ Found {active_assignments.count()} active assignments")
    
    if active_assignments.exists():
        assignment = active_assignments.first()
        print(f"\n📋 Test Assignment:")
        print(f"   Request ID: {assignment.request_id}")
        print(f"   Asset: {assignment.asset.name}")
        print(f"   User: {assignment.requested_by.get_full_name()}")
        print(f"   Current End Date: {assignment.assignment_end_date}")
        print(f"   Days Until Due: {assignment.days_until_due}")
        
        # Check existing extensions
        existing_extensions = AssignmentExtensionRequest.objects.filter(
            assignment=assignment
        )
        print(f"\n📊 Existing Extensions: {existing_extensions.count()}")
        
        for ext in existing_extensions:
            print(f"   - {ext.extension_id}: {ext.status} ({ext.extension_days} days)")
        
        # Check if can create new extension
        pending_exists = existing_extensions.filter(status='PENDING').exists()
        
        if not pending_exists and assignment.assignment_end_date:
            print(f"\n✅ Can create new extension request")
            print(f"   Current end date: {assignment.assignment_end_date}")
            print(f"   Max extension: {assignment.assignment_end_date + timedelta(days=90)}")
        else:
            print(f"\n⚠️  Cannot create extension (pending request exists or no end date)")
    
    # Get all extensions
    all_extensions = AssignmentExtensionRequest.objects.all()
    print(f"\n📈 Total Extension Requests: {all_extensions.count()}")
    
    status_counts = {}
    for status_code, status_name in AssignmentExtensionRequest.STATUS_CHOICES:
        count = all_extensions.filter(status=status_code).count()
        if count > 0:
            status_counts[status_name] = count
    
    if status_counts:
        print("\n   Status Breakdown:")
        for status, count in status_counts.items():
            print(f"   - {status}: {count}")
    
    # Test validators
    print(f"\n🔍 Testing Validators:")
    from apps.assets.validators import validate_extension_request
    
    if active_assignments.exists():
        assignment = active_assignments.first()
        try:
            # Test valid extension
            new_end_date = assignment.assignment_end_date + timedelta(days=30)
            validate_extension_request(
                assignment=assignment,
                requested_end_date=new_end_date,
                reason="Need more time to complete project"
            )
            print(f"   ✓ Valid 30-day extension passed validation")
        except Exception as e:
            print(f"   ✗ Validation failed: {e}")
        
        try:
            # Test invalid extension (too long)
            new_end_date = assignment.assignment_end_date + timedelta(days=100)
            validate_extension_request(
                assignment=assignment,
                requested_end_date=new_end_date,
                reason="Need more time"
            )
            print(f"   ✗ 100-day extension should have failed!")
        except Exception as e:
            print(f"   ✓ 100-day extension correctly rejected: {str(e)[:50]}...")
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)

if __name__ == '__main__':
    test_extension_system()
