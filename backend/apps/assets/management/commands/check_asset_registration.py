"""
Management command to check for overdue asset registrations.
BR-AM-01: Assets >10,000 ETB must be registered within 7 days

Run this command daily via cron or task scheduler:
python manage.py check_asset_registration
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.assets.models import Asset
from apps.core.models import Notification
from datetime import date

class Command(BaseCommand):
    help = 'Check for overdue asset registrations (BR-AM-01)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        # Get all high-value assets with registration deadlines
        assets = Asset.objects.filter(
            is_high_value=True,
            registration_deadline__isnull=False
        )
        
        overdue_count = 0
        warning_count = 0
        
        for asset in assets:
            days_until_deadline = (asset.registration_deadline - date.today()).days
            
            # Check if overdue
            if asset.is_registration_overdue() and not asset.registration_overdue:
                if not dry_run:
                    asset.registration_overdue = True
                    asset.save()
                    
                    # Create notification for property managers
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    property_managers = User.objects.filter(role='PROPERTY_MANAGER')
                    
                    for manager in property_managers:
                        Notification.objects.create(
                            user=manager,
                            title='Asset Registration Overdue',
                            message=f'High-value asset {asset.asset_id} ({asset.name}) registration is overdue. '
                                   f'Purchase cost: {asset.purchase_cost} ETB. Deadline was: {asset.registration_deadline}',
                            notification_type='ALERT',
                            priority='HIGH'
                        )
                
                overdue_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f'{"[DRY RUN] Would mark overdue" if dry_run else "Marked overdue"}: '
                        f'{asset.asset_id} - Deadline: {asset.registration_deadline}'
                    )
                )
            
            # Send warning 2 days before deadline
            elif days_until_deadline == 2:
                if not dry_run:
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    property_managers = User.objects.filter(role='PROPERTY_MANAGER')
                    
                    for manager in property_managers:
                        Notification.objects.create(
                            user=manager,
                            title='Asset Registration Deadline Approaching',
                            message=f'High-value asset {asset.asset_id} ({asset.name}) must be registered within 2 days. '
                                   f'Purchase cost: {asset.purchase_cost} ETB. Deadline: {asset.registration_deadline}',
                            notification_type='WARNING',
                            priority='MEDIUM'
                        )
                
                warning_count += 1
                self.stdout.write(
                    self.style.WARNING(
                        f'{"[DRY RUN] Would send warning for" if dry_run else "Sent warning for"}: '
                        f'{asset.asset_id} - 2 days until deadline'
                    )
                )
        
        # Summary
        self.stdout.write(self.style.SUCCESS('\n=== Summary ==='))
        self.stdout.write(f'Overdue registrations: {overdue_count}')
        self.stdout.write(f'Warnings sent: {warning_count}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\nThis was a dry run. No changes were made.'))
