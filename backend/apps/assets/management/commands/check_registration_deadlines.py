"""
Daily automated task to check high-value asset registration deadlines.
BR-AM-01: Assets >10,000 ETB must be registered within 7 days.

Usage: python manage.py check_registration_deadlines
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.assets.models import Asset
from apps.core.models import Notification
from datetime import date

User = get_user_model()


class Command(BaseCommand):
    help = 'Check high-value asset registration deadlines (BR-AM-01)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Checking registration deadlines...'))
        
        today = date.today()
        
        # Find high-value assets with registration deadlines
        high_value_assets = Asset.objects.filter(
            is_high_value=True,
            registration_deadline__isnull=False
        )
        
        overdue_count = 0
        warning_count = 0
        
        property_managers = User.objects.filter(
            role__in=['SUPER_ADMIN', 'PROPERTY_MANAGER']
        )
        
        for asset in high_value_assets:
            days_until_deadline = (asset.registration_deadline - today).days
            
            # Overdue
            if days_until_deadline < 0:
                overdue_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f'  ❌ OVERDUE: {asset.asset_id} - {abs(days_until_deadline)} days overdue'
                    )
                )
                
                # Send urgent notification
                for manager in property_managers:
                    Notification.objects.create(
                        user=manager,
                        notification_type='registration_overdue',
                        title='🚨 URGENT: Registration Overdue',
                        message=f'High-value asset {asset.asset_id} ({asset.name}) registration '
                               f'is overdue by {abs(days_until_deadline)} days. '
                               f'BR-AM-01 requires registration within 7 days of purchase. '
                               f'Immediate action required!',
                        related_object_type='Asset',
                        related_object_id=asset.id
                    )
            
            # Warning (1-2 days remaining)
            elif 0 <= days_until_deadline <= 2:
                warning_count += 1
                self.stdout.write(
                    self.style.WARNING(
                        f'  ⚠️  WARNING: {asset.asset_id} - {days_until_deadline} days remaining'
                    )
                )
                
                # Send warning notification
                for manager in property_managers:
                    Notification.objects.create(
                        user=manager,
                        notification_type='registration_warning',
                        title='⚠️ Registration Deadline Approaching',
                        message=f'High-value asset {asset.asset_id} ({asset.name}) must be '
                               f'registered within {days_until_deadline} day(s). '
                               f'Purchase date: {asset.purchase_date}. '
                               f'Please complete registration immediately.',
                        related_object_type='Asset',
                        related_object_id=asset.id
                    )
            
            # Upcoming (3-5 days remaining)
            elif 3 <= days_until_deadline <= 5:
                self.stdout.write(
                    f'  📅 Upcoming: {asset.asset_id} - {days_until_deadline} days remaining'
                )
        
        # Summary
        self.stdout.write(self.style.SUCCESS(f'\n✅ Check complete!'))
        self.stdout.write(f'   Total high-value assets: {high_value_assets.count()}')
        self.stdout.write(self.style.ERROR(f'   Overdue: {overdue_count}'))
        self.stdout.write(self.style.WARNING(f'   Warnings sent: {warning_count}'))
