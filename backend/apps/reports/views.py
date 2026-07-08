"""
API Views for Reporting & Compliance (BR-RC-01 through BR-RC-04)
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from django.db.models import Count, Sum, Q
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings

from apps.core.permissions import IsPropertyManager, IsSuperAdmin
from apps.core.utils import log_action, get_client_ip
from apps.assets.models import Asset
from apps.maintenance.models import MaintenanceRequest, WorkOrder
from .models import ScheduledReport, GeneratedReport, ReportDistribution, MaintenanceMetrics
from .serializers import (
    ScheduledReportSerializer, GeneratedReportSerializer,
    ReportDistributionSerializer, MaintenanceMetricsSerializer,
    ReportGenerationRequestSerializer
)
from .report_generators import generate_report, calculate_maintenance_metrics


class DashboardStatsView(APIView):
    """Dashboard statistics for role-based views."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        stats = {
            'total_assets': Asset.objects.count(),
            'assets_by_status': dict(Asset.objects.values('status').annotate(count=Count('id')).values_list('status', 'count')),
            'pending_requests': MaintenanceRequest.objects.filter(status__in=['SUBMITTED', 'ASSIGNED']).count(),
            'overdue_requests': MaintenanceRequest.objects.filter(escalated=True, status__in=['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS']).count(),
            'total_maintenance_cost': WorkOrder.objects.aggregate(total=Sum('cost_total'))['total'] or 0,
        }
        return Response(stats)


class AssetReportView(APIView):
    """Asset status and inventory report."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        assets = Asset.objects.select_related('campus', 'room').values(
            'asset_id', 'name', 'asset_type', 'status', 'campus__name', 
            'purchase_date', 'purchase_cost', 'current_value'
        )
        return Response(list(assets))


class MaintenanceCostReportView(APIView):
    """Maintenance cost analysis report."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        qs = WorkOrder.objects.select_related('request__asset')
        if start_date:
            qs = qs.filter(created_at__gte=start_date)
        if end_date:
            qs = qs.filter(created_at__lte=end_date)
        
        data = qs.values(
            'request__asset__asset_id',
            'request__asset__name',
            'request__category'
        ).annotate(
            total_cost=Sum('cost_total'),
            work_order_count=Count('id')
        )
        
        return Response(list(data))


class PreventiveComplianceReportView(APIView):
    """Preventive maintenance compliance report — scheduled vs overdue vs upcoming."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import date, timedelta
        from .report_generators import generate_preventive_compliance_report

        # Accept optional date range; default to current month
        start_str = request.query_params.get('start_date')
        end_str   = request.query_params.get('end_date')
        today = date.today()
        try:
            period_start = date.fromisoformat(start_str) if start_str else date(today.year, today.month, 1)
            period_end   = date.fromisoformat(end_str)   if end_str   else today
        except ValueError:
            period_start = date(today.year, today.month, 1)
            period_end   = today

        data = generate_preventive_compliance_report(period_start, period_end)
        return Response({'data': data})



class ScheduledReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet for scheduled reports (BR-RC-01).
    """

    queryset = ScheduledReport.objects.prefetch_related('recipients').all()
    serializer_class = ScheduledReportSerializer
    permission_classes = [IsAuthenticated, IsPropertyManager]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['report_type', 'frequency', 'status']
    ordering_fields = ['next_run', 'created_at']
    ordering = ['next_run']
    
    def perform_create(self, serializer):
        """Create scheduled report."""
        report = serializer.save(created_by=self.request.user)
        
        log_action(
            user=self.request.user,
            action='CREATE',
            model_name='ScheduledReport',
            object_id=report.id,
            details={
                'name': report.name,
                'report_type': report.report_type,
                'frequency': report.frequency
            },
            ip_address=get_client_ip(self.request)
        )
    
    @action(detail=False, methods=['get'])
    def check_due(self, request):
        """
        Check for PAUSED reports whose next_run time has arrived and auto-run them.
        Called periodically by the frontend (every 60s) instead of requiring Celery.
        """
        from datetime import date, timedelta
        now = timezone.now()

        due_reports = ScheduledReport.objects.filter(
            status='PAUSED',
            next_run__lte=now
        )

        triggered = []
        for scheduled_report in due_reports:
            try:
                today = date.today()

                if scheduled_report.frequency == 'MONTHLY':
                    period_start = today.replace(day=1)
                    period_end = today
                elif scheduled_report.frequency == 'WEEKLY':
                    period_start = today - timedelta(days=7)
                    period_end = today
                elif scheduled_report.frequency == 'DAILY':
                    period_start = today - timedelta(days=1)
                    period_end = today
                else:
                    period_start = today - timedelta(days=30)
                    period_end = today

                result = generate_report(
                    scheduled_report.report_type,
                    period_start,
                    period_end,
                    scheduled_report.parameters
                )

                generated_report = GeneratedReport.objects.create(
                    scheduled_report=scheduled_report,
                    report_type=scheduled_report.report_type,
                    title=f"{scheduled_report.name} - {today} (Auto)",
                    generated_by=scheduled_report.created_by,
                    period_start=period_start,
                    period_end=period_end,
                    data=result['data'],
                    metrics=result['metrics'],
                    follows_ethiopian_guidelines=scheduled_report.is_compliance_required
                )

                # After auto-run: update last_run, calculate next_run, go back to PAUSED
                scheduled_report.last_run = now
                scheduled_report.next_run = scheduled_report.calculate_next_run()
                scheduled_report.status = 'PAUSED'
                scheduled_report.save()

                triggered.append({
                    'id': scheduled_report.id,
                    'name': scheduled_report.name,
                    'generated_report_id': generated_report.id,
                    'next_run': scheduled_report.next_run.isoformat()
                })

                log_action(
                    user=scheduled_report.created_by,
                    action='AUTO_RUN',
                    model_name='ScheduledReport',
                    object_id=scheduled_report.id,
                    details={'generated_report_id': generated_report.id, 'trigger': 'schedule'},
                    ip_address='system'
                )
            except Exception as e:
                # Mark as FAILED and continue
                scheduled_report.status = 'FAILED'
                scheduled_report.save()

        return Response({
            'checked_at': now.isoformat(),
            'triggered_count': len(triggered),
            'triggered': triggered
        })

    @action(detail=True, methods=['post'])
    def run_now(self, request, pk=None):
        """Manually trigger report generation, then enter PAUSED state until next schedule."""
        scheduled_report = self.get_object()

        from datetime import date, timedelta
        today = date.today()

        if scheduled_report.frequency == 'MONTHLY':
            period_start = today.replace(day=1)
            period_end = today
        elif scheduled_report.frequency == 'WEEKLY':
            period_start = today - timedelta(days=7)
            period_end = today
        elif scheduled_report.frequency == 'DAILY':
            period_start = today - timedelta(days=1)
            period_end = today
        else:
            period_start = today - timedelta(days=30)
            period_end = today

        result = generate_report(
            scheduled_report.report_type,
            period_start,
            period_end,
            scheduled_report.parameters
        )

        generated_report = GeneratedReport.objects.create(
            scheduled_report=scheduled_report,
            report_type=scheduled_report.report_type,
            title=f"{scheduled_report.name} - {today}",
            generated_by=request.user,
            period_start=period_start,
            period_end=period_end,
            data=result['data'],
            metrics=result['metrics'],
            follows_ethiopian_guidelines=scheduled_report.is_compliance_required
        )

        # After manual run: update timestamps, calculate next_run, set to PAUSED
        # Report will auto-resume when next_run arrives (checked via check_due endpoint)
        scheduled_report.last_run = timezone.now()
        scheduled_report.next_run = scheduled_report.calculate_next_run()
        scheduled_report.status = 'PAUSED'
        scheduled_report.save()

        log_action(
            user=request.user,
            action='RUN_NOW',
            model_name='ScheduledReport',
            object_id=scheduled_report.id,
            details={'generated_report_id': generated_report.id},
            ip_address=get_client_ip(request)
        )

        return Response({
            'message': 'Report generated successfully. Scheduled report is now paused until next execution.',
            'report_id': generated_report.id,
            'next_run': scheduled_report.next_run.isoformat(),
            'status': 'PAUSED'
        })
    
    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        """Manually pause a scheduled report (prevents auto-run even when due)."""
        scheduled_report = self.get_object()
        scheduled_report.status = 'PAUSED'
        scheduled_report.save()

        return Response({
            'message': 'Report paused. It will not auto-run until manually resumed.',
            'status': 'PAUSED',
            'next_run': scheduled_report.next_run.isoformat() if scheduled_report.next_run else None
        })

    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        """
        Re-activate a manually-paused report.
        Restores ACTIVE status so check_due will pick it up at next_run.
        Does NOT recalculate next_run — preserves the original schedule.
        """
        scheduled_report = self.get_object()

        # If next_run has already passed (i.e. was skipped while paused),
        # recalculate from now so it doesn't immediately re-trigger.
        if scheduled_report.next_run and scheduled_report.next_run < timezone.now():
            scheduled_report.next_run = scheduled_report.calculate_next_run()

        scheduled_report.status = 'ACTIVE'
        scheduled_report.save()

        return Response({
            'message': 'Report resumed. It will run automatically at the next scheduled time.',
            'status': 'ACTIVE',
            'next_run': scheduled_report.next_run.isoformat() if scheduled_report.next_run else None
        })


class GeneratedReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet for generated reports (BR-RC-04).
    """
    queryset = GeneratedReport.objects.select_related(
        'scheduled_report', 'generated_by', 'authorized_by'
    ).prefetch_related('sent_to').all()
    serializer_class = GeneratedReportSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['report_type', 'is_draft', 'is_archived']
    ordering_fields = ['generated_at', 'period_start']
    ordering = ['-generated_at']
    
    def get_queryset(self):
        """Filter based on user role."""
        user = self.request.user
        
        if user.role in ['SUPER_ADMIN', 'PROPERTY_MANAGER']:
            return self.queryset
        
        # Other users can only see reports sent to them
        return self.queryset.filter(sent_to=user)
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate a new report (BR-RC-01, BR-RC-03, BR-RC-04)."""
        serializer = ReportGenerationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        # Generate report
        result = generate_report(
            data['report_type'],
            data['period_start'],
            data['period_end'],
            data.get('parameters', {})
        )
        
        # Create generated report with BR-RC-04 compliance
        title = data.get('title') or f"{dict(ScheduledReport.REPORT_TYPE_CHOICES)[data['report_type']]} - {data['period_start']} to {data['period_end']}"
        
        generated_report = GeneratedReport.objects.create(
            report_type=data['report_type'],
            title=title,
            generated_by=request.user,
            period_start=data['period_start'],
            period_end=data['period_end'],
            data=result['data'],
            metrics=result['metrics'],
            file_format=data['file_format'],
            follows_ethiopian_guidelines=True,
            guideline_reference='Ethiopian Federal Property Administration Guidelines'
        )
        
        # Send to recipients if requested (BR-RC-01)
        if data.get('send_to_recipients') and data.get('recipient_ids'):
            from apps.users.models import User
            recipients = User.objects.filter(id__in=data['recipient_ids'])
            generated_report.sent_to.set(recipients)
            generated_report.sent_at = timezone.now()
            generated_report.save()
            
            # Create distribution records
            for recipient in recipients:
                ReportDistribution.objects.create(
                    report=generated_report,
                    recipient=recipient,
                    recipient_email=recipient.email
                )
        
        log_action(
            user=request.user,
            action='GENERATE',
            model_name='GeneratedReport',
            object_id=generated_report.id,
            details={
                'report_type': data['report_type'],
                'period': f"{data['period_start']} to {data['period_end']}"
            },
            ip_address=get_client_ip(request)
        )
        
        return Response(
            GeneratedReportSerializer(generated_report).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'], permission_classes=[IsPropertyManager])
    def authorize(self, request, pk=None):
        """Authorize report (BR-RC-04)."""
        report = self.get_object()
        
        if report.authorized_by:
            return Response(
                {'error': 'Report already authorized'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        report.authorized_by = request.user
        report.is_draft = False
        report.save()
        
        log_action(
            user=request.user,
            action='AUTHORIZE',
            model_name='GeneratedReport',
            object_id=report.id,
            details={'title': report.title},
            ip_address=get_client_ip(request)
        )
        
        return Response({'message': 'Report authorized successfully'})
    
    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        """Send report to recipients (BR-RC-01)."""
        report = self.get_object()
        recipient_ids = request.data.get('recipient_ids', [])
        
        if not recipient_ids:
            return Response(
                {'error': 'recipient_ids required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from apps.users.models import User
        recipients = User.objects.filter(id__in=recipient_ids)
        
        report.sent_to.add(*recipients)
        report.sent_at = timezone.now()
        report.save()
        
        # Create distribution records
        for recipient in recipients:
            ReportDistribution.objects.get_or_create(
                report=report,
                recipient=recipient,
                defaults={'recipient_email': recipient.email}
            )
        
        return Response({
            'message': f'Report sent to {recipients.count()} recipients'
        })
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive report."""
        report = self.get_object()
        report.is_archived = True
        report.save()
        
        return Response({'message': 'Report archived'})
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download report as PDF with DMU logo and professional formatting."""
        from django.http import HttpResponse
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
        from io import BytesIO
        import os
        import json
        
        report = self.get_object()
        
        # Get report type display name
        report_type_dict = dict(ScheduledReport.REPORT_TYPE_CHOICES)
        report_type_display = report_type_dict.get(report.report_type, report.report_type)
        
        # Create PDF buffer
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
        
        # Container for PDF elements
        elements = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=20,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        subtitle_style = ParagraphStyle(
            'Subtitle',
            parent=styles['Normal'],
            fontSize=12,
            alignment=TA_CENTER,
            spaceAfter=30
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=12,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        )
        
        # Add University Logo
        logo_path = os.path.join(settings.BASE_DIR.parent, 'frontend', 'src', 'assets', 'images', 'branding', 'dmu-logo.png')
        
        if os.path.exists(logo_path):
            try:
                logo = Image(logo_path, width=1.5*inch, height=1.5*inch)
                logo.hAlign = 'CENTER'
                elements.append(logo)
                elements.append(Spacer(1, 0.2*inch))
            except Exception:
                pass  # Skip logo if there's an error loading it
        
        # Title
        elements.append(Paragraph(report.title, title_style))
        elements.append(Paragraph("Debre Markos University - Property Management System", subtitle_style))
        
        # Report metadata
        metadata_data = [
            ['Report ID:', str(report.id)],
            ['Report Type:', report_type_display],
            ['Period:', f"{report.period_start} to {report.period_end}"],
            ['Generated:', report.generated_at.strftime('%B %d, %Y at %I:%M %p')],
            ['Generated By:', report.generated_by.get_full_name() or report.generated_by.username],
            ['Authorized By:', report.authorized_by.get_full_name() if report.authorized_by else 'Pending Authorization'],
            ['Compliance:', 'Ethiopian Federal Guidelines' if report.follows_ethiopian_guidelines else 'N/A'],
        ]
        
        metadata_table = Table(metadata_data, colWidths=[2.5*inch, 3.5*inch])
        metadata_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e0e7ff')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(metadata_table)
        elements.append(Spacer(1, 20))
        
        # Maintenance Metrics
        if report.metrics:
            elements.append(Paragraph('Performance Metrics', heading_style))
            
            metrics_data = [
                ['Metric', 'Value'],
                ['Mean Time To Repair (MTTR)', f"{report.metrics.get('mean_time_to_repair', 0):.1f} hours"],
                ['First-Time Fix Rate', f"{report.metrics.get('first_time_fix_rate', 0):.1f}%"],
                ['Cost Per Repair', f"ETB {report.metrics.get('cost_per_repair', 0):,.2f}"],
                ['Total Requests', str(report.metrics.get('total_requests', 0))],
                ['Completed Requests', str(report.metrics.get('completed_requests', 0))],
                ['Total Cost', f"ETB {report.metrics.get('total_cost', 0):,.2f}"],
            ]
            
            metrics_table = Table(metrics_data, colWidths=[3*inch, 3*inch])
            metrics_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f3f4f6')),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('TOPPADDING', (0, 1), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ]))
            
            elements.append(metrics_table)
            elements.append(Spacer(1, 20))
        
        # Asset Summary
        if report.data and 'summary' in report.data:
            elements.append(Paragraph('Asset Overview', heading_style))
            
            summary = report.data['summary']
            summary_data = [
                ['Metric', 'Count'],
                ['Total Assets', str(summary.get('total_assets', 0))],
                ['New Assets This Period', str(summary.get('new_assets_this_period', 0))],
                ['High Value Assets', str(summary.get('high_value_assets', 0))],
                ['Assets Needing Verification', str(summary.get('assets_needing_verification', 0))],
                ['Overdue Registration', str(summary.get('high_value_overdue_registration', 0))],
                ['Total Asset Value', f"ETB {summary.get('total_asset_value', 0):,}"],
            ]
            
            summary_table = Table(summary_data, colWidths=[3*inch, 3*inch])
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f3f4f6')),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('TOPPADDING', (0, 1), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ]))
            
            elements.append(summary_table)
            elements.append(Spacer(1, 20))
        
        # Distribution by Campus
        if report.data and 'by_campus' in report.data:
            elements.append(Paragraph('Distribution by Campus', heading_style))
            
            campus_data = [['Campus', 'Asset Count', 'Total Value (ETB)']]
            for campus in report.data['by_campus']:
                campus_data.append([
                    campus.get('campus__name', 'Unknown'),
                    str(campus.get('count', 0)),
                    f"ETB {campus.get('total_value', 0):,}"
                ])
            
            campus_table = Table(campus_data, colWidths=[2.5*inch, 1.5*inch, 2*inch])
            campus_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f3f4f6')),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('TOPPADDING', (0, 1), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ]))
            
            elements.append(campus_table)
            elements.append(Spacer(1, 20))
        
        # Footer
        elements.append(Spacer(1, 30))
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.grey,
            alignment=TA_CENTER
        )
        elements.append(Paragraph(
            f"This document was generated electronically on {timezone.now().strftime('%B %d, %Y at %I:%M %p')}",
            footer_style
        ))
        elements.append(Paragraph(
            "Debre Markos University - Property Management System",
            footer_style
        ))
        elements.append(Spacer(1, 10))
        
        # Disclaimer
        disclaimer_style = ParagraphStyle(
            'Disclaimer',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#6B7280'),
            alignment=TA_CENTER,
            spaceAfter=12
        )
        elements.append(Paragraph(report.data_currency_disclaimer, disclaimer_style))
        
        # Build PDF
        doc.build(elements)
        
        # Get PDF value
        pdf = buffer.getvalue()
        buffer.close()
        
        # Create response
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{report.title.replace(" ", "_")}.pdf"'
        response.write(pdf)
        
        log_action(
            user=request.user,
            action='DOWNLOAD',
            model_name='GeneratedReport',
            object_id=report.id,
            details={'title': report.title},
            ip_address=get_client_ip(request)
        )
        
        return response


class MaintenanceMetricsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for maintenance metrics (BR-RC-03).
    """
    queryset = MaintenanceMetrics.objects.select_related('calculated_by').all()
    serializer_class = MaintenanceMetricsSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    ordering_fields = ['period_end', 'calculated_at']
    ordering = ['-period_end']
    
    @action(detail=False, methods=['post'])
    def calculate(self, request):
        """Calculate metrics for a period (BR-RC-03)."""
        period_start = request.data.get('period_start')
        period_end = request.data.get('period_end')
        
        if not period_start or not period_end:
            return Response(
                {'error': 'period_start and period_end required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from datetime import datetime
        period_start = datetime.strptime(period_start, '%Y-%m-%d').date()
        period_end = datetime.strptime(period_end, '%Y-%m-%d').date()
        
        # Calculate metrics
        from .report_generators import (
            calculate_maintenance_metrics,
            calculate_metrics_by_category,
            calculate_metrics_by_priority
        )
        
        metrics = calculate_maintenance_metrics(period_start, period_end)
        metrics_by_category = calculate_metrics_by_category(period_start, period_end)
        metrics_by_priority = calculate_metrics_by_priority(period_start, period_end)
        
        # Get overdue requests
        overdue_requests = MaintenanceRequest.objects.filter(
            created_at__gte=period_start,
            created_at__lte=period_end,
            escalated=True
        ).count()
        
        # Create metrics record
        metrics_record = MaintenanceMetrics.objects.create(
            period_start=period_start,
            period_end=period_end,
            mean_time_to_repair=metrics['mean_time_to_repair'],
            first_time_fix_rate=metrics['first_time_fix_rate'],
            cost_per_repair=metrics['cost_per_repair'],
            total_requests=metrics['total_requests'],
            completed_requests=metrics['completed_requests'],
            overdue_requests=overdue_requests,
            total_cost=metrics['total_cost'],
            metrics_by_category=metrics_by_category,
            metrics_by_priority=metrics_by_priority,
            calculated_by=request.user
        )
        
        log_action(
            user=request.user,
            action='CALCULATE',
            model_name='MaintenanceMetrics',
            object_id=metrics_record.id,
            details={
                'period': f"{period_start} to {period_end}",
                'mttr': str(metrics['mean_time_to_repair']),
                'first_time_fix_rate': str(metrics['first_time_fix_rate'])
            },
            ip_address=get_client_ip(request)
        )
        
        return Response(
            MaintenanceMetricsSerializer(metrics_record).data,
            status=status.HTTP_201_CREATED
        )
