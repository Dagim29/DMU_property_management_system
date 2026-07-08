#!/usr/bin/env python3
"""
Fix work order assignment notification links
Updates old notification links to point to technician-specific work order detail pages
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.core.models import Notification
from apps.users.models import User

def fix_work_order_notification_links():
    """Update work order assignment notification links"""
    
    print("🔧 Fixing work order assignment notification links...\n")
    
    # Find all "New Work Order Assigned" notifications
    work_order_notifications = Notification.objects.filter(
        title='New Work Order Assigned'
    ).select_related('user')
    
    total = work_order_notifications.count()
    print(f"Found {total} work order assignment notifications\n")
    
    if total == 0:
        print("✅ No notifications to fix!")
        return
    
    updated = 0
    skipped = 0
    
    for notification in work_order_notifications:
        # Check if notification already has a link
        if notification.link and '/dashboard/technician/work-orders/' in notification.link:
            print(f"  ⏭️  Notification {notification.id} already has correct link")
            skipped += 1
            continue
        
        # Try to extract work order ID from the message
        # Message formats:
        # - "You have been assigned to maintenance request REQ-XXXXX"
        # - "You have been assigned to request MR-YYYYMMDDHHMMSS"
        import re
        message = notification.message
        
        # Try to find the request ID (both formats)
        match = re.search(r'(REQ-\d+|MR-\d+)', message)
        if match:
            request_id = match.group(1)
            
            # Find the work order for this request and technician
            try:
                from apps.maintenance.models import MaintenanceRequest, WorkOrder
                
                # Find the maintenance request
                maintenance_request = MaintenanceRequest.objects.filter(
                    request_id=request_id
                ).first()
                
                if maintenance_request:
                    # Find the work order for this request assigned to this technician
                    work_order = WorkOrder.objects.filter(
                        request=maintenance_request,
                        assigned_to=notification.user
                    ).first()
                    
                    if work_order:
                        # Update the notification link
                        notification.link = f'/dashboard/technician/work-orders/{work_order.id}'
                        notification.save(update_fields=['link'])
                        updated += 1
                        print(f"  ✓ Updated notification {notification.id} → WO-{work_order.id} ({request_id})")
                    else:
                        print(f"  ⚠️  No work order found for {request_id} assigned to {notification.user.get_full_name()}")
                        skipped += 1
                else:
                    print(f"  ⚠️  Maintenance request {request_id} not found")
                    skipped += 1
            except Exception as e:
                print(f"  ❌ Error processing notification {notification.id}: {e}")
                skipped += 1
        else:
            print(f"  ⚠️  Could not extract request ID from: {message}")
            skipped += 1
    
    print(f"\n{'='*60}")
    print(f"✅ Update complete!")
    print(f"   Updated: {updated}")
    print(f"   Skipped: {skipped}")
    print(f"   Total: {total}")
    print(f"{'='*60}\n")
    
    print("New notification links will point to:")
    print("  /dashboard/technician/work-orders/{work_order_id}")
    print("\nThis ensures technicians see their specialized work order interface!")

if __name__ == '__main__':
    fix_work_order_notification_links()
