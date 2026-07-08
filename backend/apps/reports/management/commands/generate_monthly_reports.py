"""
Management command to generate monthly reports (BR-RC-01)
Schedule: Run on 5th of each month at 8 AM
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from apps.reports.models import ScheduledReport, GeneratedReport
from apps.reports.report_generators import generate_report
from apps.users.models import User


class Command(BaseCommand):
    help = 'Generate and send monthly reports (BR-RC-01)'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without actually generating reports'
        )
        parser.add_argument(
            '--report-id',
            type=int,
            help='Generate specific scheduled report by ID'
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        report_id = options.get('report_id')
        
        today = date.today()
        
        # Get scheduled reports that should run today
        if report_id:
            scheduled_reports = ScheduledReport.objects.filter(
                id=report_id,
                status='ACTIVE'
            )
        else:
            scheduled_reports = ScheduledReport.objects.filter(
                status='ACTIVE',
                frequency='MONTHLY',
                day_of_month=today.day
            )
        
        if not scheduled_reports.exists():
            self.stdout.write(
                self.style.WARNING('No scheduled reports to run today')
            )
            return
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Found {scheduled_reports.count()} scheduled report(s) to run'
            )
        )
        
        for scheduled_report in scheduled_reports:
            self.stdout.write(f'\nProcessing: {scheduled_report.name}')
            
            if dry_run:
                self.stdout.write(
                    self.style.WARNING('  [DRY RUN] Would generate report')
                )
                continue
            
            try:
                # Calculate period (previous month)
                first_day_this_month = today.replace(day=1)
                last_day_prev_month = first_day_this_month - timedelta(days=1)
                first_day_prev_month = last_day_prev_month.replace(day=1)
                
                period_start = first_day_prev_month
                period_end = last_day_prev_month
                
                self.stdout.write(
                    f'  Period: {period_start} to {period_end}'
                )
                
                # Generate report
                result = generate_report(
                    scheduled_report.report_type,
                    period_start,
                    period_end,
                    scheduled_report.parameters
                )
                
                # Create generated report with BR-RC-04 compliance
                generated_report = GeneratedReport.objects.create(
                    scheduled_report=scheduled_report,
                    report_type=scheduled_report.report_type,
                    title=f"{scheduled_report.name} - {period_start.strftime('%B %Y')}",
                    generated_by=None,  # System generated
                    period_start=period_start,
                    period_end=period_end,
                    data=result['data'],
                    metrics=result['metrics'],
                    follows_ethiopian_guidelines=scheduled_report.is_compliance_required,
                    guideline_reference='Ethiopian Federal Property Administration Guidelines'
                )
                
                self.stdout.write(
                    self.style.SUCCESS(f'  ✓ Report generated (ID: {generated_report.id})')
                )
                
                # Send to recipients (BR-RC-01)
                recipients = scheduled_report.recipients.all()
                if recipients.exists():
                    generated_report.sent_to.set(recipients)
                    generated_report.sent_at = timezone.now()
                    generated_report.save()
                    
                    # Create distribution records
                    from apps.reports.models import ReportDistribution
                    for recipient in recipients:
                        ReportDistribution.objects.create(
                            report=generated_report,
                            recipient=recipient,
                            recipient_email=recipient.email
                        )
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'  ✓ Sent to {recipients.count()} recipient(s)'
                        )
                    )
                    
                    # Send email notifications
                    self._send_email_notifications(
                        generated_report,
                        recipients
                    )
                
                # Update scheduled report
                scheduled_report.last_run = timezone.now()
                scheduled_report.next_run = scheduled_report.calculate_next_run()
                scheduled_report.save()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ✓ Next run: {scheduled_report.next_run}'
                    )
                )
                
            except Exception as e:
                scheduled_report.status = 'FAILED'
                scheduled_report.save()
                
                self.stdout.write(
                    self.style.ERROR(f'  ✗ Error: {str(e)}')
                )
        
        self.stdout.write(
            self.style.SUCCESS('\n✓ Monthly report generation complete')
        )
    
    def _send_email_notifications(self, report, recipients):
        """Send email notifications to recipients."""
        from django.core.mail import send_mail
        from django.conf import settings
        
        subject = f'Monthly Report: {report.title}'
        message = f"""
Dear Recipient,

A new monthly report has been generated and is available for your review.

Report: {report.title}
Period: {report.period_start} to {report.period_end}
Generated: {report.generated_at.strftime('%Y-%m-%d %H:%M')}

Key Metrics:
- MTTR: {report.metrics.get('mean_time_to_repair', 'N/A')} hours
- First-Time Fix Rate: {report.metrics.get('first_time_fix_rate', 'N/A')}%
- Cost Per Repair: {report.metrics.get('cost_per_repair', 'N/A')} ETB

Please log in to the Property Management System to view the full report.

---
{report.data_currency_disclaimer}

This report follows Ethiopian Federal Property Administration Guidelines.
        """
        
        recipient_emails = [r.email for r in recipients if r.email]
        
        if recipient_emails:
            try:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    recipient_emails,
                    fail_silently=False,
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ✓ Email notifications sent to {len(recipient_emails)} recipient(s)'
                    )
                )
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'  ⚠ Email sending failed: {str(e)}')
                )
