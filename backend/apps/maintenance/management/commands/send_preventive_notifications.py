"""
BR-OW-03: Send preventive maintenance notifications
Notifications sent at: 30 days before, 7 days before, due date, 7 days after
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.maintenance.models import PreventiveMaintenance
from apps.core.models import Notification


class Command(BaseCommand):
    help = 'Send preventive maintenance notifications (BR-OW-03)'

    def handle(self, *args, **options):
        today = timezone.now().date()
        
        # Get all active preventive maintenance schedules
        schedules = PreventiveMaintenance.objects.filter(is_active=True)
        
        notifications_sent = 0
        
        for schedule in schedules:
            days_until_due = (schedule.next_due_date - today).days
            
            # BR-OW-03: Send notifications at specific intervals
            notification_message = None
            notification_type = None
            
            if days_until_due == 30:
                notification_message = f'Preventive maintenance for {schedule.asset.asset_id} due in 30 days'
                notification_type = 'PREVENTIVE_30_DAYS'
            elif days_until_due == 7:
                notification_message = f'Preventive maintenance for {schedule.asset.asset_id} due in 7 days'
                notification_type = 'PREVENTIVE_7_DAYS'
            elif days_until_due == 0:
                notification_message = f'Preventive maintenance for {schedule.asset.asset_id} is due TODAY'
                notification_type = 'PREVENTIVE_DUE'
            elif days_until_due == -7:
                notification_message = f'Preventive maintenance for {schedule.asset.asset_id} is 7 days OVERDUE'
                notification_type = 'PREVENTIVE_OVERDUE'
            
            if notification_message:
                # Create notification for property managers and supervisors
                from apps.users.models import User
                recipients = User.objects.filter(
                    role__in=['PROPERTY_MANAGER', 'MAINTENANCE_SUPERVISOR'],
                    is_active=True
                )
                
                for recipient in recipients:
                    Notification.objects.create(
                        user=recipient,
                        title='Preventive Maintenance Reminder',
                        message=notification_message,
                        notification_type=notification_type,
                        link=f'/dashboard/maintenance/preventive'
                    )
                    notifications_sent += 1
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Sent {len(recipients)} notifications for {schedule.asset.asset_id} ({days_until_due} days)'
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Total notifications sent: {notifications_sent}')
        )
