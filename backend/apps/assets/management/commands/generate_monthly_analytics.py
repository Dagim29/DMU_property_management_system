"""
Monthly automated task to generate comprehensive analytics.
Run on the 1st of each month to analyze previous month's data.

Usage: python manage.py generate_monthly_analytics
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Count, Avg, Sum, Q, F
from apps.assets.assignment_models import AssetAssignmentRequest
from apps.assets.models import Asset
from apps.maintenance.models import MaintenanceRequest, WorkOrder
from apps.core.models import Notification
from datetime import timedelta
from decimal import Decimal

User = get_user_model()


class Command(BaseCommand):
    help = 'Generate monthly analytics report'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Generating monthly analytics...'))
        
        # Calculate previous month
        today = timezone.now()
        first_of_month = today.replace(day=1)
        last_month_end = first_of_month - timedelta(days=1)
        last_month_start = last_month_end.replace(day=1)
        
        month_name = last_month_start.strftime('%B %Y')
        self.stdout.write(f'Analyzing: {month_name}')
        
        # Assignment Analytics
        assignment_stats = self._analyze_assignments(last_month_start, last_month_end)
        
        # Maintenance Analytics
        maintenance_stats = self._analyze_maintenance(last_month_start, last_month_end)
        
        # Asset Analytics
        asset_stats = self._analyze_assets(last_month_start, last_month_end)
        
        # User Analytics
        user_stats = self._analyze_users(last_month_start, last_month_end)
        
        # Print comprehensive report
        self._print_report(month_name, assignment_stats, maintenance_stats, asset_stats, user_stats)
        
        # Send to administrators
        self._send_report(month_name, assignment_stats, maintenance_stats, asset_stats, user_stats)
        
        self.stdout.write(self.style.SUCCESS('\n✅ Monthly analytics complete!'))

    def _analyze_assignments(self, start, end):
        """Analyze assignment request data."""
        total_requests = AssetAssignmentRequest.objects.filter(
            request_date__gte=start,
            request_date__lte=end
        ).count()
        
        approved = AssetAssignmentRequest.objects.filter(
            review_date__gte=start,
            review_date__lte=end,
            status='APPROVED'
        ).count()
        
        rejected = AssetAssignmentRequest.objects.filter(
            review_date__gte=start,
            review_date__lte=end,
            status='REJECTED'
        ).count()
        
        approval_rate = (approved / total_requests * 100) if total_requests > 0 else 0
        
        avg_processing_time = AssetAssignmentRequest.objects.filter(
            review_date__gte=start,
            review_date__lte=end,
            review_date__isnull=False
        ).annotate(
            processing_time=F('review_date') - F('request_date')
        ).aggregate(avg_time=Avg('processing_time'))
        
        return {
            'total_requests': total_requests,
            'approved': approved,
            'rejected': rejected,
            'approval_rate': round(approval_rate, 1),
            'avg_processing_days': avg_processing_time['avg_time'].days if avg_processing_time['avg_time'] else 0
        }

    def _analyze_maintenance(self, start, end):
        """Analyze maintenance request data."""
        total_requests = MaintenanceRequest.objects.filter(
            created_at__gte=start,
            created_at__lte=end
        ).count()
        
        completed = WorkOrder.objects.filter(
            completed_at__gte=start,
            completed_at__lte=end,
            status='COMPLETED'
        ).count()
        
        total_cost = WorkOrder.objects.filter(
            completed_at__gte=start,
            completed_at__lte=end,
            status='COMPLETED'
        ).aggregate(total=Sum('total_cost'))['total'] or Decimal('0')
        
        avg_resolution_time = WorkOrder.objects.filter(
            completed_at__gte=start,
            completed_at__lte=end,
            status='COMPLETED'
        ).annotate(
            resolution_time=F('completed_at') - F('created_at')
        ).aggregate(avg_time=Avg('resolution_time'))
        
        return {
            'total_requests': total_requests,
            'completed': completed,
            'total_cost': float(total_cost),
            'avg_resolution_hours': avg_resolution_time['avg_time'].total_seconds() / 3600 if avg_resolution_time['avg_time'] else 0
        }

    def _analyze_assets(self, start, end):
        """Analyze asset data."""
        new_assets = Asset.objects.filter(
            created_at__gte=start,
            created_at__lte=end
        ).count()
        
        total_assets = Asset.objects.count()
        available = Asset.objects.filter(status='AVAILABLE').count()
        in_use = Asset.objects.filter(status='IN_USE').count()
        under_maintenance = Asset.objects.filter(status='UNDER_MAINTENANCE').count()
        
        utilization_rate = (in_use / total_assets * 100) if total_assets > 0 else 0
        
        return {
            'new_assets': new_assets,
            'total_assets': total_assets,
            'available': available,
            'in_use': in_use,
            'under_maintenance': under_maintenance,
            'utilization_rate': round(utilization_rate, 1)
        }

    def _analyze_users(self, start, end):
        """Analyze user activity."""
        active_requesters = AssetAssignmentRequest.objects.filter(
            request_date__gte=start,
            request_date__lte=end
        ).values('requested_by').distinct().count()
        
        return {
            'active_requesters': active_requesters
        }

    def _print_report(self, month, assignments, maintenance, assets, users):
        """Print formatted report to console."""
        self.stdout.write('\n' + '='*70)
        self.stdout.write(self.style.SUCCESS(f'MONTHLY ANALYTICS REPORT - {month}'))
        self.stdout.write('='*70)
        
        self.stdout.write('\n📦 ASSIGNMENT REQUESTS:')
        self.stdout.write(f'   Total Requests: {assignments["total_requests"]}')
        self.stdout.write(f'   Approved: {assignments["approved"]}')
        self.stdout.write(f'   Rejected: {assignments["rejected"]}')
        self.stdout.write(f'   Approval Rate: {assignments["approval_rate"]}%')
        self.stdout.write(f'   Avg Processing Time: {assignments["avg_processing_days"]} days')
        
        self.stdout.write('\n🔧 MAINTENANCE:')
        self.stdout.write(f'   Total Requests: {maintenance["total_requests"]}')
        self.stdout.write(f'   Completed Work Orders: {maintenance["completed"]}')
        self.stdout.write(f'   Total Cost: {maintenance["total_cost"]:,.2f} ETB')
        self.stdout.write(f'   Avg Resolution Time: {maintenance["avg_resolution_hours"]:.1f} hours')
        
        self.stdout.write('\n📊 ASSETS:')
        self.stdout.write(f'   New Assets: {assets["new_assets"]}')
        self.stdout.write(f'   Total Assets: {assets["total_assets"]}')
        self.stdout.write(f'   Available: {assets["available"]}')
        self.stdout.write(f'   In Use: {assets["in_use"]}')
        self.stdout.write(f'   Under Maintenance: {assets["under_maintenance"]}')
        self.stdout.write(f'   Utilization Rate: {assets["utilization_rate"]}%')
        
        self.stdout.write('\n👥 USERS:')
        self.stdout.write(f'   Active Requesters: {users["active_requesters"]}')
        
        self.stdout.write('\n' + '='*70)

    def _send_report(self, month, assignments, maintenance, assets, users):
        """Send report to administrators."""
        admins = User.objects.filter(role__in=['SUPER_ADMIN', 'PROPERTY_MANAGER'])
        
        report_message = f"""
Monthly Analytics Report - {month}

ASSIGNMENT REQUESTS:
• Total: {assignments["total_requests"]}
• Approved: {assignments["approved"]} ({assignments["approval_rate"]}%)
• Rejected: {assignments["rejected"]}
• Avg Processing: {assignments["avg_processing_days"]} days

MAINTENANCE:
• Requests: {maintenance["total_requests"]}
• Completed: {maintenance["completed"]}
• Total Cost: {maintenance["total_cost"]:,.2f} ETB
• Avg Resolution: {maintenance["avg_resolution_hours"]:.1f} hours

ASSETS:
• New: {assets["new_assets"]}
• Total: {assets["total_assets"]}
• Utilization: {assets["utilization_rate"]}%
• Available: {assets["available"]}
• In Use: {assets["in_use"]}

USERS:
• Active Requesters: {users["active_requesters"]}
        """.strip()
        
        for admin in admins:
            Notification.objects.create(
                user=admin,
                notification_type='monthly_analytics',
                title=f'📊 Monthly Analytics - {month}',
                message=report_message
            )
        
        self.stdout.write(f'📧 Report sent to {admins.count()} administrators')
