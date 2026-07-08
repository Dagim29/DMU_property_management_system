from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.core.models import AuditLog
from apps.assets.models import Asset
from apps.maintenance.models import MaintenanceRequest
from datetime import datetime, timedelta
import random

User = get_user_model()


class Command(BaseCommand):
    help = 'Populate database with sample audit logs'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample audit logs...')
        
        # Get users
        users = list(User.objects.all())
        if not users:
            self.stdout.write(self.style.ERROR('No users found. Run populate_sample_data first.'))
            return
        
        # Get assets and maintenance requests
        assets = list(Asset.objects.all())
        requests = list(MaintenanceRequest.objects.all())
        
        # Create various audit log entries
        actions = [
            ('LOGIN', 'User', None, {}),
            ('LOGOUT', 'User', None, {}),
        ]
        
        # Add asset-related actions
        for asset in assets[:5]:  # Limit to first 5 assets
            actions.extend([
                ('CREATE', 'Asset', asset.id, {'asset_id': asset.asset_id, 'name': asset.name}),
                ('UPDATE', 'Asset', asset.id, {'asset_id': asset.asset_id, 'field': 'status'}),
            ])
        
        # Add maintenance request actions
        for req in requests[:3]:  # Limit to first 3 requests
            actions.extend([
                ('CREATE', 'MaintenanceRequest', req.id, {'request_id': req.request_id}),
                ('ASSIGN', 'MaintenanceRequest', req.id, {'request_id': req.request_id}),
                ('STATUS_CHANGE', 'MaintenanceRequest', req.id, {'request_id': req.request_id, 'status': req.status}),
            ])
        
        # Create audit logs with timestamps spread over the last 30 days
        base_time = datetime.now()
        created_count = 0
        
        for i, (action, model_name, object_id, details) in enumerate(actions):
            # Random user
            user = random.choice(users)
            
            # Create timestamp (spread over last 30 days)
            days_ago = random.randint(0, 30)
            hours_ago = random.randint(0, 23)
            minutes_ago = random.randint(0, 59)
            timestamp = base_time - timedelta(days=days_ago, hours=hours_ago, minutes=minutes_ago)
            
            # Random IP address
            ip_address = f"192.168.{random.randint(1, 255)}.{random.randint(1, 255)}"
            
            # Create audit log
            log = AuditLog.objects.create(
                user=user,
                action=action,
                model_name=model_name,
                object_id=str(object_id) if object_id else str(user.id),
                details=details,
                ip_address=ip_address,
            )
            # Manually set timestamp
            log.timestamp = timestamp
            log.save(update_fields=['timestamp'])
            
            created_count += 1
        
        # Add some recent login/logout logs for all users
        for user in users:
            for day in range(7):  # Last 7 days
                timestamp = base_time - timedelta(days=day, hours=random.randint(8, 18))
                ip_address = f"192.168.1.{random.randint(100, 200)}"
                
                # Login
                log = AuditLog.objects.create(
                    user=user,
                    action='LOGIN',
                    model_name='User',
                    object_id=str(user.id),
                    details={'username': user.username},
                    ip_address=ip_address,
                )
                log.timestamp = timestamp
                log.save(update_fields=['timestamp'])
                
                # Logout (a few hours later)
                logout_time = timestamp + timedelta(hours=random.randint(1, 8))
                log = AuditLog.objects.create(
                    user=user,
                    action='LOGOUT',
                    model_name='User',
                    object_id=str(user.id),
                    details={'username': user.username},
                    ip_address=ip_address,
                )
                log.timestamp = logout_time
                log.save(update_fields=['timestamp'])
                
                created_count += 2
        
        self.stdout.write(self.style.SUCCESS(f'Created {created_count} audit log entries!'))
        self.stdout.write(self.style.SUCCESS('Audit logs populated successfully!'))
