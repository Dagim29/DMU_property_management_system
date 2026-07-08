"""
Django management command to create owner users and assign them assets.
Run: python manage.py setup_owners
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from apps.users.models import User
from apps.assets.models import Asset, AssetCheckout
from apps.maintenance.models import MaintenanceRequest


class Command(BaseCommand):
    help = 'Create owner users and assign them assets for testing the Owner Portal'

    def handle(self, *args, **options):
        self.stdout.write("=" * 60)
        self.stdout.write("OWNER PORTAL SETUP")
        self.stdout.write("=" * 60)
        
        # Create owner users
        owners = self.create_owner_users()
        
        # Assign assets
        self.assign_assets_to_owners(owners)
        
        # Create checkouts
        self.create_sample_checkouts(owners)
        
        # Create maintenance requests
        self.create_sample_maintenance_requests(owners)
        
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("SETUP COMPLETE!"))
        self.stdout.write("=" * 60)
        self.stdout.write("\nOwner Portal Test Credentials:")
        self.stdout.write("-" * 60)
        self.stdout.write("Username: staff.john    | Password: password123")
        self.stdout.write("Username: staff.sarah   | Password: password123")
        self.stdout.write("Username: student.mike  | Password: password123")
        self.stdout.write("Username: student.emma  | Password: password123")
        self.stdout.write("-" * 60)
        self.stdout.write("\nYou can now:")
        self.stdout.write("1. Login with any of these credentials")
        self.stdout.write("2. Navigate to /dashboard/owner")
        self.stdout.write("3. Test all owner portal features")
        self.stdout.write("=" * 60)

    def create_owner_users(self):
        """Create sample owner users (staff and students)."""
        
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("CREATING OWNER USERS")
        self.stdout.write("=" * 60)
        
        owners_data = [
            {
                'username': 'staff.john',
                'email': 'john.doe@dmu.edu',
                'first_name': 'John',
                'last_name': 'Doe',
                'password': 'password123',
                'role': 'OWNER',
                'department': 'Computer Science'
            },
            {
                'username': 'staff.sarah',
                'email': 'sarah.smith@dmu.edu',
                'first_name': 'Sarah',
                'last_name': 'Smith',
                'password': 'password123',
                'role': 'OWNER',
                'department': 'Engineering'
            },
            {
                'username': 'student.mike',
                'email': 'mike.johnson@student.dmu.edu',
                'first_name': 'Mike',
                'last_name': 'Johnson',
                'password': 'password123',
                'role': 'OWNER',
                'department': 'Business Administration'
            },
            {
                'username': 'student.emma',
                'email': 'emma.wilson@student.dmu.edu',
                'first_name': 'Emma',
                'last_name': 'Wilson',
                'password': 'password123',
                'role': 'OWNER',
                'department': 'Health Sciences'
            }
        ]
        
        created_users = []
        
        for owner_data in owners_data:
            username = owner_data['username']
            
            # Check if user already exists
            if User.objects.filter(username=username).exists():
                user = User.objects.get(username=username)
                self.stdout.write(self.style.WARNING(f"✓ User '{username}' already exists"))
            else:
                user = User.objects.create_user(
                    username=owner_data['username'],
                    email=owner_data['email'],
                    password=owner_data['password'],
                    first_name=owner_data['first_name'],
                    last_name=owner_data['last_name'],
                    role=owner_data['role'],
                    department=owner_data['department']
                )
                self.stdout.write(self.style.SUCCESS(f"✓ Created user: {username}"))
            
            created_users.append(user)
        
        return created_users

    def assign_assets_to_owners(self, owners):
        """Assign assets to owner users."""
        
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("ASSIGNING ASSETS TO OWNERS")
        self.stdout.write("=" * 60)
        
        # Get available assets
        available_assets = list(Asset.objects.filter(assigned_to__isnull=True)[:20])
        
        if not available_assets:
            self.stdout.write(self.style.WARNING("⚠ No available assets to assign."))
            return
        
        assets_per_owner = len(available_assets) // len(owners)
        
        for i, owner in enumerate(owners):
            start_idx = i * assets_per_owner
            end_idx = start_idx + assets_per_owner
            owner_assets = available_assets[start_idx:end_idx]
            
            for asset in owner_assets:
                asset.assigned_to = owner
                asset.status = 'IN_USE'
                asset.save()
            
            self.stdout.write(self.style.SUCCESS(
                f"✓ Assigned {len(owner_assets)} assets to {owner.username}"
            ))

    def create_sample_checkouts(self, owners):
        """Create sample checkouts for owners."""
        
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("CREATING SAMPLE CHECKOUTS")
        self.stdout.write("=" * 60)
        
        # Get property manager for checkout approval
        try:
            manager = User.objects.filter(role='PROPERTY_MANAGER').first()
            if not manager:
                self.stdout.write(self.style.WARNING(
                    "⚠ No property manager found. Skipping checkouts."
                ))
                return
        except Exception as e:
            self.stdout.write(self.style.WARNING(
                f"⚠ Error finding property manager: {e}. Skipping checkouts."
            ))
            return
        
        for owner in owners[:2]:  # Create checkouts for first 2 owners
            # Get assets not assigned to this owner
            available_assets = list(Asset.objects.exclude(assigned_to=owner)[:2])
            
            for i, asset in enumerate(available_assets):
                # Create one active and one overdue checkout
                days_offset = -5 if i == 0 else 7  # First one overdue, second one active
                
                checkout = AssetCheckout.objects.create(
                    asset=asset,
                    checked_out_to=owner,
                    checked_out_by=manager,
                    expected_return_date=timezone.now().date() + timedelta(days=days_offset),
                    checkout_condition='GOOD',
                    purpose=f'Testing checkout for {owner.username}',
                    notes='Sample checkout for owner portal testing'
                )
                
                status = "overdue" if days_offset < 0 else "active"
                self.stdout.write(self.style.SUCCESS(
                    f"✓ Created {status} checkout for {owner.username}: {asset.asset_id}"
                ))

    def create_sample_maintenance_requests(self, owners):
        """Create sample maintenance requests for owners."""
        
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("CREATING SAMPLE MAINTENANCE REQUESTS")
        self.stdout.write("=" * 60)
        
        statuses = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED']
        priorities = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']
        categories = ['ELECTRICAL', 'PLUMBING', 'HVAC', 'EQUIPMENT']
        
        for owner in owners:
            # Get assets assigned to this owner
            owner_assets = list(Asset.objects.filter(assigned_to=owner)[:3])
            
            if not owner_assets:
                self.stdout.write(self.style.WARNING(
                    f"⚠ No assets assigned to {owner.username}. Skipping requests."
                ))
                continue
            
            for i, asset in enumerate(owner_assets):
                request = MaintenanceRequest.objects.create(
                    asset=asset,
                    requested_by=owner,
                    category=categories[i % len(categories)],
                    priority=priorities[i % len(priorities)],
                    status=statuses[i % len(statuses)],
                    description=f'Sample maintenance request for {asset.name}. Testing owner portal functionality.'
                )
                
                self.stdout.write(self.style.SUCCESS(
                    f"✓ Created {request.status} request for {owner.username}: {request.request_id}"
                ))
