"""
Weekly automated task to generate summary reports.
Run every Monday to summarize previous week's activities.

Usage: python manage.py generate_weekly_summary
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from apps.assets.assignment_models import AssetAssignmentRequest
from apps.assets.models import Asset
from apps.maintenance.models import MaintenanceRequest, WorkOrder
from apps.core.models import Notification
from datetime import timedelta

User = get_user_model()


class Command(BaseCommand):
    help = 'Generate weekly summary report'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Generating weekly summary...'))
        
        # Calculate date range (last 7 days)
        end_date = timezone.now()
        start_date = end_date - timedelta(days=7)
        
        self.stdout.write(f'Period: {start_date.date()} to {end_date.date()}')
        
        # Asset Assignment Statistics
        new_requests = AssetAssignmentRequest.objects.filter(
            request_date__gte=start_date,
            request_date__lte=end_date
        ).count()
        
        approved_requests = AssetAssignmentRequest.objects.filter(
            review_date__gte=start_date,
            review_date__lte=end_date,
            status='APPROVED'
        ).count()
        
        active_assignments = AssetAssignmentRequest.objects.filter(
            assignment_start_date__gte=start_date,
            assignment_start_date__lte=end_date,
            status='ACTIVE'
        ).count()
        
        returned_assets = AssetAssignmentRequest.objects.filter(
            actual_return_date__gte=start_date,
            actual_return_date__lte=end_date,
            status='RETURNED'
        ).count()
        
        overdue_assignments = AssetAssignmentRequest.objects.filter(
            status='ACTIVE',
            is_overdue=True
        ).count()
        
        # Maintenance Statistics
        new_maintenance = MaintenanceRequest.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        ).count()
        
        completed_work_orders = WorkOrder.objects.filter(
            completed_at__gte=start_date,
            completed_at__lte=end_date,
            status='COMPLETED'
        ).count()
        
        # Asset Statistics
        new_assets = Asset.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        ).count()
        
        # Print summary
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('WEEKLY SUMMARY REPORT'))
        self.stdout.write('='*60)
        
        self.stdout.write('\n📦 ASSET ASSIGNMENTS:')
        self.stdout.write(f'   New Requests: {new_requests}')
        self.stdout.write(f'   Approved: {approved_requests}')
        self.stdout.write(f'   Activated: {active_assignments}')
        self.stdout.write(f'   Returned: {returned_assets}')
        self.stdout.write(self.style.WARNING(f'   Currently Overdue: {overdue_assignments}'))
        
        self.stdout.write('\n🔧 MAINTENANCE:')
        self.stdout.write(f'   New Requests: {new_maintenance}')
        self.stdout.write(f'   Completed Work Orders: {completed_work_orders}')
        
        self.stdout.write('\n📊 ASSETS:')
        self.stdout.write(f'   New Assets Added: {new_assets}')
        
        # Send summary to Property Managers
        property_managers = User.objects.filter(
            role__in=['SUPER_ADMIN', 'PROPERTY_MANAGER']
        )
        
        summary_message = f"""
Weekly Summary ({start_date.date()} to {end_date.date()}):

Asset Assignments:
• New Requests: {new_requests}
• Approved: {approved_requests}
• Activated: {active_assignments}
• Returned: {returned_assets}
• Currently Overdue: {overdue_assignments}

Maintenance:
• New Requests: {new_maintenance}
• Completed Work Orders: {completed_work_orders}

Assets:
• New Assets: {new_assets}
        """.strip()
        
        for manager in property_managers:
            Notification.objects.create(
                user=manager,
                notification_type='weekly_summary',
                title='📊 Weekly Summary Report',
                message=summary_message
            )
        
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS(f'✅ Summary sent to {property_managers.count()} managers'))
