#!/usr/bin/env python3
"""
Fix notification links for team communication
Updates old /dashboard/team-communication links to role-specific links
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
from django.db import models

def fix_notification_links():
    """Update notification links to be role-specific"""
    
    print("🔧 Fixing notification links...")
    
    # Find all notifications with old team-communication link
    old_notifications = Notification.objects.filter(
        link__contains='/dashboard/team-communication'
    ).select_related('user')
    
    total = old_notifications.count()
    print(f"Found {total} notifications with old links")
    
    if total == 0:
        print("✅ No notifications to fix!")
        return
    
    updated = 0
    
    for notification in old_notifications:
        user = notification.user
        
        # Try to extract sender info from notification title
        # Format: "New message from [Name]" or "📢 Broadcast from [Name]"
        sender_id = None
        if "New message from" in notification.title or "Broadcast from" in notification.title:
            # Try to find the sender by name in the title
            import re
            match = re.search(r'from (.+)$', notification.title)
            if match:
                sender_name = match.group(1)
                # Try to find user by name
                try:
                    sender = User.objects.filter(
                        models.Q(first_name__icontains=sender_name.split()[0]) |
                        models.Q(username__icontains=sender_name)
                    ).first()
                    if sender:
                        sender_id = sender.id
                except:
                    pass
        
        # Determine correct link based on user role
        if user.role == 'MAINTENANCE_SUPERVISOR':
            base_link = '/dashboard/supervisor/communication'
        elif user.role == 'MAINTENANCE_TECHNICIAN':
            base_link = '/dashboard/technician/communication'
        else:
            base_link = '/dashboard/communication'
        
        # Add sender ID if found
        if sender_id:
            new_link = f"{base_link}?user={sender_id}"
        else:
            new_link = base_link
        
        # Update the notification
        notification.link = new_link
        notification.save(update_fields=['link'])
        updated += 1
        
        print(f"  ✓ Updated notification {notification.id} for {user.get_full_name()} ({user.role})")
    
    print(f"\n✅ Updated {updated} notifications!")
    print("\nNew links:")
    print("  - Supervisors: /dashboard/supervisor/communication?user=X")
    print("  - Technicians: /dashboard/technician/communication?user=X")

if __name__ == '__main__':
    fix_notification_links()
