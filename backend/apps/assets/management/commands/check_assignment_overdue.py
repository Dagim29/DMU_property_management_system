"""
Management command to check for overdue assignments and send reminders.
Run this daily via cron: python manage.py check_assignment_overdue
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from apps.assets.assignment_models import AssetAssignmentRequest, AssignmentRequestHistory
from apps.core.models import Notification


class Command(BaseCommand):
    help = 'Check for overdue assignments and send reminders'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('CHECKING OVERDUE ASSIGNMENTS'))
        self.stdout.write(self.style.SUCCESS('='*60 + '\n'))

        # Update overdue status for all active assignments
        active_assignments = AssetAssignmentRequest.objects.filter(status='ACTIVE')
        
        overdue_count = 0
        reminder_count = 0
        
        for assignment in active_assignments:
            # Update overdue status
            assignment.update_overdue_status()
            
            if assignment.is_overdue:
                overdue_count += 1
                
                # Send reminder if not sent today
                if not assignment.last_reminder_date or assignment.last_reminder_date.date() < date.today():
                    self._send_overdue_reminder(assignment)
                    reminder_count += 1
                    
                    # Update reminder tracking
                    assignment.reminder_sent_count += 1
                    assignment.last_reminder_date = timezone.now()
                    assignment.save()
                    
                    # Create history entry
                    AssignmentRequestHistory.objects.create(
                        request=assignment,
                        action='REMINDER_SENT',
                        notes=f'Overdue reminder sent ({assignment.overdue_days} days overdue)'
                    )
        
        # Check for assignments ending soon (3 days)
        three_days_from_now = date.today() + timedelta(days=3)
        ending_soon = AssetAssignmentRequest.objects.filter(
            status='ACTIVE',
            assignment_end_date__lte=three_days_from_now,
            assignment_end_date__gte=date.today()
        )
        
        ending_soon_count = 0
        for assignment in ending_soon:
            # Send reminder if not sent today
            if not assignment.last_reminder_date or assignment.last_reminder_date.date() < date.today():
                self._send_ending_soon_reminder(assignment)
                ending_soon_count += 1
                
                assignment.reminder_sent_count += 1
                assignment.last_reminder_date = timezone.now()
                assignment.save()
        
        # Summary
        self.stdout.write(self.style.SUCCESS(f'\n✓ Processed {active_assignments.count()} active assignments'))
        self.stdout.write(self.style.WARNING(f'✓ Found {overdue_count} overdue assignments'))
        self.stdout.write(self.style.SUCCESS(f'✓ Sent {reminder_count} overdue reminders'))
        self.stdout.write(self.style.SUCCESS(f'✓ Sent {ending_soon_count} ending soon reminders'))
        self.stdout.write(self.style.SUCCESS('\n' + '='*60 + '\n'))

    def _send_overdue_reminder(self, assignment):
        """Send overdue reminder notification."""
        Notification.objects.create(
            user=assignment.requested_by,
            notification_type='request_overdue',
            title=f'Asset Return Overdue - {assignment.asset.name}',
            message=f'Your assignment of {assignment.asset.name} is {assignment.overdue_days} days overdue. Please return it immediately.',
            related_model='AssetAssignmentRequest',
            related_id=assignment.id
        )
        
        # Also notify property manager
        from django.contrib.auth import get_user_model
        User = get_user_model()
        managers = User.objects.filter(role__in=['SUPER_ADMIN', 'PROPERTY_MANAGER'])
        
        for manager in managers:
            Notification.objects.create(
                user=manager,
                notification_type='request_overdue',
                title=f'Overdue Assignment - {assignment.request_id}',
                message=f'{assignment.requested_by.get_full_name()} has an overdue assignment ({assignment.overdue_days} days)',
                related_model='AssetAssignmentRequest',
                related_id=assignment.id
            )
        
        self.stdout.write(f'  → Sent overdue reminder for {assignment.request_id} ({assignment.overdue_days} days)')

    def _send_ending_soon_reminder(self, assignment):
        """Send ending soon reminder notification."""
        days_left = assignment.days_until_due()
        
        Notification.objects.create(
            user=assignment.requested_by,
            notification_type='asset_assignment',
            title=f'Assignment Ending Soon - {assignment.asset.name}',
            message=f'Your assignment of {assignment.asset.name} ends in {days_left} days. Please prepare to return it.',
            related_model='AssetAssignmentRequest',
            related_id=assignment.id
        )
        
        self.stdout.write(f'  → Sent ending soon reminder for {assignment.request_id} ({days_left} days left)')
