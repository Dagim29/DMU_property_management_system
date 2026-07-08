"""
Management command to check for expired passwords and send reminders.
BR-UM-05: Password changes mandatory every 90 days (admin) / 180 days (staff)

Run this command daily via cron or task scheduler:
python manage.py check_password_expiry
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.core.models import Notification
from apps.users.models import SecurityAlert

User = get_user_model()


class Command(BaseCommand):
    help = 'Check for expired passwords and send reminders (BR-UM-05)'

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
        
        expired_count = 0
        reminder_7_days = 0
        reminder_14_days = 0
        reminder_30_days = 0
        
        for user in users:
            # Skip if no password expiry set
            if not user.password_expires_at:
                continue
            
            days_until_expiry = user.days_until_password_expires()
            
            # Check if password has expired
            if user.is_password_expired():
                if not dry_run:
                    user.password_change_required = True
                    user.save()
                    
                    # Create security alert
                    SecurityAlert.objects.create(
                        user=user,
                        alert_type='PASSWORD_EXPIRED',
                        severity='HIGH',
                        message=f'Password has expired. User must change password on next login.',
                        details={
                            'password_changed_at': user.password_changed_at.isoformat() if user.password_changed_at else None,
                            'password_expires_at': user.password_expires_at.isoformat(),
                            'role': user.role,
                            'expiry_period_days': user.get_password_expiry_days()
                        }
                    )
                    
                    # Create notification
                    Notification.objects.create(
                        user=user,
                        title='Password Expired',
                        message='Your password has expired. You will be required to change it on your next login.',
                        notification_type='SECURITY',
                        priority='HIGH'
                    )
                
                expired_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f'{"[DRY RUN] Would mark expired" if dry_run else "Marked expired"} {user.username} - Password expired'
                    )
                )
            
            # Send reminders at 30, 14, and 7 days
            elif days_until_expiry == 30:
                if not dry_run:
                    Notification.objects.create(
                        user=user,
                        title='Password Expiring Soon',
                        message=f'Your password will expire in 30 days. Please change it soon to avoid being locked out.',
                        notification_type='SECURITY',
                        priority='MEDIUM'
                    )
                reminder_30_days += 1
                self.stdout.write(
                    self.style.WARNING(
                        f'{"[DRY RUN] Would send 30-day reminder to" if dry_run else "Sent 30-day reminder to"} {user.username}'
                    )
                )
            
            elif days_until_expiry == 14:
                if not dry_run:
                    Notification.objects.create(
                        user=user,
                        title='Password Expiring Soon',
                        message=f'Your password will expire in 14 days. Please change it to maintain access.',
                        notification_type='SECURITY',
                        priority='MEDIUM'
                    )
                reminder_14_days += 1
                self.stdout.write(
                    self.style.WARNING(
                        f'{"[DRY RUN] Would send 14-day reminder to" if dry_run else "Sent 14-day reminder to"} {user.username}'
                    )
                )
            
            elif days_until_expiry == 7:
                if not dry_run:
                    Notification.objects.create(
                        user=user,
                        title='Password Expiring Very Soon',
                        message=f'Your password will expire in 7 days. Change it now to avoid being locked out.',
                        notification_type='SECURITY',
                        priority='HIGH'
                    )
                reminder_7_days += 1
                self.stdout.write(
                    self.style.WARNING(
                        f'{"[DRY RUN] Would send 7-day reminder to" if dry_run else "Sent 7-day reminder to"} {user.username}'
                    )
                )
        
        # Summary
        self.stdout.write(self.style.SUCCESS('\n=== Summary ==='))
        self.stdout.write(f'Expired passwords: {expired_count}')
        self.stdout.write(f'30-day reminders: {reminder_30_days}')
        self.stdout.write(f'14-day reminders: {reminder_14_days}')
        self.stdout.write(f'7-day reminders: {reminder_7_days}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\nThis was a dry run. No changes were made.'))
