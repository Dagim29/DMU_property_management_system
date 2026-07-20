import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User
from apps.assets.models import Campus, Asset

print("Creating sample users...")

users_to_create = [
    {'username': 'manager', 'role': 'PROPERTY_MANAGER', 'email': 'manager@example.com'},
    {'username': 'supervisor', 'role': 'MAINTENANCE_SUPERVISOR', 'email': 'supervisor@example.com'},
    {'username': 'tech', 'role': 'MAINTENANCE_TECHNICIAN', 'email': 'tech@example.com'},
]

for user_data in users_to_create:
    user, created = User.objects.get_or_create(username=user_data['username'], defaults={'role': user_data['role'], 'email': user_data['email']})
    if created:
        user.set_password('password123')
        user.save()
        print(f"Created user {user.username} with role {user.role}")
    else:
        print(f"User {user.username} already exists")

print("Creating sample campus and assets...")
campus, created = Campus.objects.get_or_create(name="Main Campus")
if created:
    print("Created Main Campus")

for i in range(1, 4):
    asset, created = Asset.objects.get_or_create(
        asset_id=f"EQP-00{i}",
        defaults={
            'name': f"Sample Equipment {i}",
            'asset_type': 'EQP',
            'campus': campus,
            'status': 'ACTIVE'
        }
    )
    if created:
        print(f"Created asset {asset.asset_id}")

print("Basic setup complete!")
