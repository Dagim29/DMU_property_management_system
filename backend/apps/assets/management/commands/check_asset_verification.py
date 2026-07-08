"""
Management command to check for asset verification schedules and overdue discrepancy reports.
BR-AM-04: Annual physical verification with 14-day discrepancy reporting

Run this command daily via cron or task scheduler:
python manage.py check_asset_verification
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.assets.models import Asset, AssetVerification
from apps.core.models import Notification
from datetime import date, timedelta

class Command(BaseCommand):
    help = 'Check asset verification schedules and discrepancy reports (BR-AM-04)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )
        parser.add_argument(
            '--schedule-annual',
            action='store_true',
            help='Schedule annual verifications for all assets',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        schedule_annual = options['schedule_annual']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        # Schedule annual verifications if requested
        if schedule_annual:
            self.schedule_annual_verifications(dry_run)
            return
        
        # Check for overdue verifications
        overdue_verifications = 0
        verification_warnings = 0
        
        assets = Asset.objects.filter(next_verification_date__isnull=False)
        
        for asset in assets:
            days_until = asset.days_until_verification()
            
            if days_until is not None:
                # Overdue verification
                if days_until < 0:
                    if not dry_run:
                        asset.verification_status = 'PENDING'
                        asset.save()
                        
                        # Notify property managers
                        from django.contrib.auth import get_user_model
                        User = get_user_model()
                        property_managers = User.objects.filter(role='PROPERTY_MANAGER')
                        
                        for manager in property_managers:
                            Notification.objects.create(
                                user=manager,
                                title='Asset Verification Overdue',
                                message=f'Asset {asset.asset_id} ({asset.name}) verification is overdue by {abs(days_until)} days.',
                                notification_type='ALERT',
                                priority='HIGH'
                            )
                    
                    overdue_verifications += 1
                    self.stdout.write(
                        self.style.ERROR(
                            f'{"[DRY RUN] Would mark overdue" if dry_run else "Marked overdue"}: '
                            f'{asset.asset_id} - {abs(days_until)} days overdue'
                        )
                    )
                
                # Warning 7 days before
                elif days_until == 7:
                    if not dry_run:
                        from django.contrib.auth import get_user_model
                        User = get_user_model()
                        property_managers = User.objects.filter(role='PROPERTY_MANAGER')
                        
                        for manager in property_managers:
                            Notification.objects.create(
                                user=manager,
                                title='Asset Verification Due Soon',
                                message=f'Asset {asset.asset_id} ({asset.name}) verification is due in 7 days.',
                                notification_type='WARNING',
                                priority='MEDIUM'
                            )
                    
                    verification_warnings += 1
                    self.stdout.write(
                        self.style.WARNING(
                            f'{"[DRY RUN] Would send warning for" if dry_run else "Sent warning for"}: '
                            f'{asset.asset_id} - 7 days until verification'
                        )
                    )
        
        # Check for overdue discrepancy reports
        overdue_reports = 0
        report_warnings = 0
        
        verifications = AssetVerification.objects.filter(
            has_discrepancy=True,
            discrepancy_report_submitted=False,
            discrepancy_report_deadline__isnull=False
        )
        
        for verification in verifications:
            days_until_deadline = verification.days_until_report_deadline()
            
            if days_until_deadline is not None:
                # Overdue report
                if days_until_deadline < 0:
                    if not dry_run:
                        from django.contrib.auth import get_user_model
                        User = get_user_model()
                        property_managers = User.objects.filter(role='PROPERTY_MANAGER')
                        
                        for manager in property_managers:
                            Notification.objects.create(
                                user=manager,
                                title='Discrepancy Report Overdue',
                                message=f'Discrepancy report for asset {verification.asset.asset_id} is overdue by {abs(days_until_deadline)} days. '
                                       f'Discrepancy type: {verification.get_discrepancy_type_display()}',
                                notification_type='ALERT',
                                priority='CRITICAL'
                            )
                    
                    overdue_reports += 1
                    self.stdout.write(
                        self.style.ERROR(
                            f'{"[DRY RUN] Would mark report overdue" if dry_run else "Report overdue"}: '
                            f'{verification.asset.asset_id} - {abs(days_until_deadline)} days overdue'
                        )
                    )
                
                # Warning 3 days before deadline
                elif days_until_deadline == 3:
                    if not dry_run:
                        from django.contrib.auth import get_user_model
                        User = get_user_model()
                        property_managers = User.objects.filter(role='PROPERTY_MANAGER')
                        
                        for manager in property_managers:
                            Notification.objects.create(
                                user=manager,
                                title='Discrepancy Report Due Soon',
                                message=f'Discrepancy report for asset {verification.asset.asset_id} is due in 3 days. '
                                       f'Discrepancy type: {verification.get_discrepancy_type_display()}',
                                notification_type='WARNING',
                                priority='HIGH'
                            )
                    
                    report_warnings += 1
                    self.stdout.write(
                        self.style.WARNING(
                            f'{"[DRY RUN] Would send report warning for" if dry_run else "Sent report warning for"}: '
                            f'{verification.asset.asset_id} - 3 days until deadline'
                        )
                    )
        
        # Summary
        self.stdout.write(self.style.SUCCESS('\n=== Summary ==='))
        self.stdout.write(f'Overdue verifications: {overdue_verifications}')
        self.stdout.write(f'Verification warnings: {verification_warnings}')
        self.stdout.write(f'Overdue discrepancy reports: {overdue_reports}')
        self.stdout.write(f'Report warnings: {report_warnings}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\nThis was a dry run. No changes were made.'))
    
    def schedule_annual_verifications(self, dry_run):
        """Schedule annual verifications for all assets."""
        self.stdout.write(self.style.SUCCESS('Scheduling annual verifications...'))
        
        assets = Asset.objects.all()
        scheduled_count = 0
        
        for asset in assets:
            # Only schedule if not already scheduled
            if not asset.next_verification_date:
                if not dry_run:
                    # Schedule verification for 1 year from now (or from last verification)
                    if asset.last_verification_date:
                        asset.next_verification_date = asset.last_verification_date + timedelta(days=365)
                    else:
                        asset.next_verification_date = date.today() + timedelta(days=365)
                    
                    asset.verification_status = 'PENDING'
                    asset.save()
                
                scheduled_count += 1
                self.stdout.write(
                    f'{"[DRY RUN] Would schedule" if dry_run else "Scheduled"}: {asset.asset_id}'
                )
        
        self.stdout.write(self.style.SUCCESS(f'\nScheduled {scheduled_count} verifications'))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('This was a dry run. No changes were made.'))
