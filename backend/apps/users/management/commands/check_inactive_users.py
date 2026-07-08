"""
Management command to check for inactive users and send warnings/disable accounts.
BR-UM-04: Inactive accounts (180 days) auto-disabled with 30-day notice

Run this command daily via cron or task scheduler:
python manage.py check_inactive_users
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.core.models import Notification
from apps.users.models import SecurityAlert
from datetime import timedelta

User = get_user_model()


class Command(BaseCommand):
    help = 'Check for inactive users and send warnings or disable accounts (BR-UM-04)'

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
        
        # Get all active users
        users = User.objects.filter(is_active=True)
        
        warnings_sent = 0
        accounts_disabled = 0
        
        for user in users:
            # Skip if no last_activity (new users)
            if not user.last_activity:
                continue
            
            days_inactive = user.days_since_last_activity()
            
            # Check if user should be disabled (180+ days inactive)
            if days_inactive >= 180:
                if not dry_run:
                    user.is_active = False
                    user.auto_disabled_date = timezone.now()
                    user.save()
                    
                    # Create security alert
                    SecurityAlert.objects.create(
                        user=user,
                        alert_type='ACCOUNT_DISABLED',
                        severity='HIGH',
                        message=f'Account automatically disabled due to {days_inactive} days of inactivity',
                        details={
                            'days_inactive': days_inactive,
                            'last_activity': user.last_activity.isoformat(),
                            'auto_disabled_date': timezone.now().isoformat()
                        }
                    )
                    
                    # Create notification
                    Notification.objects.create(
                        user=user,
                        title='Account Disabled',
                        message=f'Your account has been automatically disabled due to {days_inactive} days of inactivity. Please contact the administrator to reactivate.',
                        notification_type='SECURITY',
                        priority='HIGH'
                    )
                
                accounts_disabled += 1
                self.stdout.write(
                    self.style.ERROR(
                        f'{"[DRY RUN] Would disable" if dry_run else "Disabled"} {user.username} - {days_inactive} days inactive'
                    )
                )
            
            # Check if 30-day warning should be sent (150+ days inactive)
            elif user.should_send_inactivity_warning():
                if not dry_run:
                    user.inactivity_warning_sent = True
                    user.inactivity_warning_date = timezone.now()
                    user.save()
                    
                    # Create security alert
                    SecurityAlert.objects.create(
                        user=user,
                        alert_type='INACTIVITY_WARNING',
                        severity='MEDIUM',
                        message=f'User has been inactive for {days_inactive} days. Account will be disabled in {180 - days_inactive} days.',
                        details={
                            'days_inactive': days_inactive,
                            'days_until_disabled': 180 - days_inactive,
                            'last_activity': user.last_activity.isoformat()
                        }
                    )
                    
                    # Create notification
                    Notification.objects.create(
                        user=user,
                        title='Inactivity Warning',
                        message=f'Your account has been inactive for {days_inactive} days. It will be automatically disabled in {180 - days_inactive} days if you do not log in.',
                        notification_type='SECURITY',
                        priority='MEDIUM'
                    )
                
                warnings_sent += 1
                self.stdout.write(
                    self.style.WARNING(
                        f'{"[DRY RUN] Would send warning to" if dry_run else "Sent warning to"} {user.username} - {days_inactive} days inactive'
                    )
                )
        
        # Summary
        self.stdout.write(self.style.SUCCESS('\n=== Summary ==='))
        self.stdout.write(f'Warnings sent: {warnings_sent}')
        self.stdout.write(f'Accounts disabled: {accounts_disabled}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\nThis was a dry run. No changes were made.'))
