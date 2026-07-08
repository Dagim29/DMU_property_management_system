"""
Test script for IP Access Control functionality
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User, IPAccessControl
from django.utils import timezone

def create_sample_ip_rules():
    """Create sample IP access control rules."""
    
    # Get admin user
    admin = User.objects.filter(role='SUPER_ADMIN').first()
    if not admin:
        print("No admin user found. Creating one...")
        admin = User.objects.create_superuser(
            username='admin',
            email='admin@dmu.edu.et',
            password='admin123',
            first_name='System',
            last_name='Administrator'
        )
        admin.role = 'SUPER_ADMIN'
        admin.save()
    
    print(f"Using admin user: {admin.username}")
    
    # Clear existing rules
    IPAccessControl.objects.all().delete()
    print("Cleared existing IP rules")
    
    # Create whitelist entries
    whitelist_entries = [
        {
            'ip_address': '192.168.1.0/24',
            'description': 'Office Network - Main Campus',
            'country': 'Ethiopia',
            'city': 'Addis Ababa'
        },
        {
            'ip_address': '10.0.0.0/8',
            'description': 'VPN Network - Remote Access',
            'country': 'Ethiopia',
            'city': 'Addis Ababa'
        },
        {
            'ip_address': '172.16.0.0/12',
            'description': 'Internal Network - IT Department',
            'country': 'Ethiopia',
            'city': 'Addis Ababa'
        },
        {
            'ip_address': '203.0.113.100',
            'description': 'Admin Workstation',
            'country': 'Ethiopia',
            'city': 'Addis Ababa'
        },
    ]
    
    for entry in whitelist_entries:
        IPAccessControl.objects.create(
            ip_address=entry['ip_address'],
            list_type='WHITELIST',
            description=entry['description'],
            country=entry.get('country', ''),
            city=entry.get('city', ''),
            added_by=admin
        )
        print(f"✓ Created whitelist entry: {entry['ip_address']}")
    
    # Create blacklist entries
    blacklist_entries = [
        {
            'ip_address': '203.0.113.0',
            'description': 'Suspicious Activity - Multiple Failed Logins',
            'block_count': 15,
            'country': 'Unknown',
            'city': 'Unknown'
        },
        {
            'ip_address': '198.51.100.0/24',
            'description': 'Known Attack Source - Blocked by Security Team',
            'block_count': 42,
            'country': 'Unknown',
            'city': 'Unknown'
        },
        {
            'ip_address': '192.0.2.50',
            'description': 'Brute Force Attempt Detected',
            'block_count': 8,
            'country': 'Unknown',
            'city': 'Unknown'
        },
    ]
    
    for entry in blacklist_entries:
        ip_rule = IPAccessControl.objects.create(
            ip_address=entry['ip_address'],
            list_type='BLACKLIST',
            description=entry['description'],
            country=entry.get('country', ''),
            city=entry.get('city', ''),
            added_by=admin,
            block_count=entry.get('block_count', 0)
        )
        
        # Set last_used for some entries
        if entry.get('block_count', 0) > 0:
            ip_rule.last_used = timezone.now()
            ip_rule.save()
        
        print(f"✓ Created blacklist entry: {entry['ip_address']}")
    
    print("\n" + "="*60)
    print("IP Access Control Rules Created Successfully!")
    print("="*60)
    print(f"Whitelist entries: {IPAccessControl.objects.filter(list_type='WHITELIST').count()}")
    print(f"Blacklist entries: {IPAccessControl.objects.filter(list_type='BLACKLIST').count()}")
    print(f"Total rules: {IPAccessControl.objects.count()}")
    print("\nYou can now test the IP Control section in the Security Center!")

if __name__ == '__main__':
    create_sample_ip_rules()
