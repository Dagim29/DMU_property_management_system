"""
Daily automated task to send reminders for upcoming due dates.
Sends reminders at 7 days, 3 days, and 1 day before due date.

Usage: python manage.py send_due_date_reminders
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.assets.assignment_models import AssetAssignmentRequest, AssignmentRequestHistory
from apps.core.models import Notification
from datetime import date, timedelta


class Command(BaseCommand):
    help = 'Send reminders for assignments approaching due date'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be sent without actually sending',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Checking for upcoming due dates...'))
        
        today = date.today()
        reminder_days = [7, 3, 1]  # Days before due date to send reminders
        
        total_sent = 0
        
        for days in reminder_days:
            target_date = today + timedelta(days=days)
            
            # Find assignments due on target date
            assignments = AssetAssignmentRequest.objects.filter(
                status='ACTIVE',
                assignment_end_date=target_date,
                is_overdue=False
            )
            
            self.stdout.write(f'\n📅 Checking assignments due in {days} days ({target_date})...')
            self.stdout.write(f'   Found: {assignments.count()} assignments')
            
            for assignment in assignments:
                if options['dry_run']:
                    self.stdout.write(
                        f'   [DRY RUN] Would send reminder for {assignment.request_id} '
                        f'to {assignment.requested_by.username}'
                    )
                else:
                    self._send_reminder(assignment, days)
                    total_sent += 1
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'   ✉️  Sent {days}-day reminder for {assignment.request_id}'
                        )
                    )
        
        if options['dry_run']:
            self.stdout.write(self.style.WARNING('\n⚠️  DRY RUN - No notifications sent'))
        else:
            self.stdout.write(self.style.SUCCESS(f'\n✅ Sent {total_sent} reminders'))

    def _send_reminder(self, assignment, days_until_due):
        """Send reminder notification to user."""
        urgency_emoji = '⚠️' if days_until_due <= 3 else '📅'
        urgency_text = 'URGENT: ' if days_until_due <= 1 else ''
        
        Notification.objects.create(
            user=assignment.requested_by,
            notification_type='asset_due_reminder',
            title=f'{urgency_emoji} {urgency_text}Asset Return Reminder',
            message=f'Your assignment of {assignment.asset.name} is due in {days_until_due} '
                   f'day{"s" if days_until_due > 1 else ""}. '
                   f'Due date: {assignment.assignment_end_date.strftime("%B %d, %Y")}. '
                   f'Please plan to return it on time.',
            related_object_type='AssetAssignmentRequest',
            related_object_id=assignment.id
        )
        
        # Update reminder tracking
        assignment.reminder_sent_count += 1
        assignment.last_reminder_date = timezone.now()
        assignment.save(update_fields=['reminder_sent_count', 'last_reminder_date'])
        
        # Create history entry
        AssignmentRequestHistory.objects.create(
            request=assignment,
            action='REMINDER_SENT',
            notes=f'{days_until_due}-day reminder sent to user'
        )
