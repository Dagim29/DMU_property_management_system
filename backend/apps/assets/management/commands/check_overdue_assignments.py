"""
Daily automated task to check and update overdue assignments.
Run this command daily via cron job or task scheduler.

Usage: python manage.py check_overdue_assignments
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.assets.assignment_models import AssetAssignmentRequest, AssignmentRequestHistory
from apps.core.models import Notification
from datetime import date

User = get_user_model()


class Command(BaseCommand):
    help = 'Check for overdue assignments and send notifications'

    def add_arguments(self, parser):
        parser.add_argument(
            '--send-notifications',
            action='store_true',
            help='Send notifications to users and property managers',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting overdue assignment check...'))
        
        # Get all active assignments
        active_assignments = AssetAssignmentRequest.objects.filter(
            status='ACTIVE',
            assignment_end_date__isnull=False
        )
        
        updated_count = 0
        newly_overdue = []
        
        for assignment in active_assignments:
            old_overdue_status = assignment.is_overdue
            old_overdue_days = assignment.overdue_days
            
            # Update overdue status
            assignment.update_overdue_status()
            
            # Check if newly overdue
            if assignment.is_overdue and not old_overdue_status:
                newly_overdue.append(assignment)
                updated_count += 1
                
                # Create history entry
                AssignmentRequestHistory.objects.create(
                    request=assignment,
                    action='OVERDUE',
                    old_status='ACTIVE',
                    new_status='ACTIVE',
                    notes=f'Assignment became overdue by {assignment.overdue_days} days'
                )
                
                self.stdout.write(
                    self.style.WARNING(
                        f'  ⚠️  {assignment.request_id} - {assignment.asset.asset_id} '
                        f'overdue by {assignment.overdue_days} days'
                    )
                )
            elif assignment.is_overdue and old_overdue_days != assignment.overdue_days:
                # Update existing overdue
                updated_count += 1
                self.stdout.write(
                    f'  📅 {assignment.request_id} - Updated overdue days: {assignment.overdue_days}'
                )
        
        # Send notifications if requested
        if options['send_notifications'] and newly_overdue:
            self._send_overdue_notifications(newly_overdue)
        
        # Summary
        total_overdue = AssetAssignmentRequest.objects.filter(is_overdue=True).count()
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ Check complete!'))
        self.stdout.write(f'   Total active assignments: {active_assignments.count()}')
        self.stdout.write(f'   Total overdue: {total_overdue}')
        self.stdout.write(f'   Newly overdue: {len(newly_overdue)}')
        self.stdout.write(f'   Updated: {updated_count}')

    def _send_overdue_notifications(self, overdue_assignments):
        """Send notifications for overdue assignments."""
        self.stdout.write('\n📧 Sending notifications...')
        
        # Get all property managers
        property_managers = User.objects.filter(
            role__in=['SUPER_ADMIN', 'PROPERTY_MANAGER']
        )
        
        for assignment in overdue_assignments:
            # Notify user
            Notification.objects.create(
                user=assignment.requested_by,
                notification_type='asset_overdue',
                title='⚠️ Asset Return Overdue',
                message=f'Your assignment of {assignment.asset.name} is overdue by '
                       f'{assignment.overdue_days} days. Please return it immediately.',
                related_object_type='AssetAssignmentRequest',
                related_object_id=assignment.id
            )
            
            # Notify property managers
            for manager in property_managers:
                Notification.objects.create(
                    user=manager,
                    notification_type='asset_overdue_manager',
                    title='Asset Assignment Overdue',
                    message=f'{assignment.requested_by.get_full_name()} has not returned '
                           f'{assignment.asset.name} ({assignment.asset.asset_id}). '
                           f'Overdue by {assignment.overdue_days} days.',
                    related_object_type='AssetAssignmentRequest',
                    related_object_id=assignment.id
                )
            
            # Update reminder count
            assignment.reminder_sent_count += 1
            assignment.last_reminder_date = timezone.now()
            assignment.save(update_fields=['reminder_sent_count', 'last_reminder_date'])
            
            self.stdout.write(f'  ✉️  Sent notifications for {assignment.request_id}')
        
        self.stdout.write(self.style.SUCCESS(f'✅ Sent {len(overdue_assignments)} notifications'))
