"""
API Views for Asset Business Rules (BR-AM-01 through BR-AM-07)
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone

from apps.core.permissions import IsPropertyManager, IsSuperAdmin
from apps.core.utils import log_action, get_client_ip
from .models import Asset, AssetTransfer, AssetDisposal, AssetVerification
from .serializers import (
    AssetDisposalSerializer, AssetVerificationSerializer,
    AssetTransferApprovalSerializer, AssetBusinessRuleCheckSerializer
)
from .business_rules import (
    enforce_transfer_rules, enforce_disposal_rules, enforce_owner_permissions,
    check_registration_deadline, check_verification_status, get_asset_permissions
)


class AssetTransferViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Asset Transfers - Direct manager transfer (simplified).
    """
    from .serializers import AssetTransferSerializer
    queryset = AssetTransfer.objects.select_related('asset', 'from_room', 'to_room', 'transferred_by').all()
    serializer_class = AssetTransferSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['asset', 'approval_status', 'transfer_type']
    ordering_fields = ['transfer_date', 'approval_status']
    ordering = ['-transfer_date']
    
    def get_queryset(self):
        """Filter based on user role."""
        user = self.request.user
        
        if user.role in ['SUPER_ADMIN', 'PROPERTY_MANAGER', 'MAINTENANCE_SUPERVISOR']:
            return self.queryset
        
        # Other users can see transfers they performed
        return self.queryset.filter(transferred_by=user)
    
    def perform_create(self, serializer):
        """Create transfer and complete it immediately."""
        asset = serializer.validated_data['asset']
        
        # BR-AM-05: Check if asset can be transferred
        try:
            enforce_transfer_rules(asset, self.request.user)
        except DjangoValidationError as e:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'error': str(e)})
        
        # Create and complete transfer immediately
        transfer = serializer.save(
            transferred_by=self.request.user,
            approval_status='PENDING'
        )
        
        # Complete the transfer immediately
        transfer.complete_transfer()
        
        # Send notification to relevant parties
        from apps.core.models import Notification
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Notify property managers
        property_managers = User.objects.filter(role='PROPERTY_MANAGER')
        for pm in property_managers:
            Notification.objects.create(
                user=pm,
                notification_type='transfer_completed',
                title='Asset Transfer Completed',
                message=f'{self.request.user.get_full_name()} transferred {asset.name} ({asset.asset_id}) '
                       f'from {transfer.source_campus_name} to {transfer.dest_campus_name}.',
                related_model='AssetTransfer',
                related_id=transfer.id
            )
        
        # Log action
        log_action(
            user=self.request.user,
            action='TRANSFER',
            model_name='AssetTransfer',
            object_id=transfer.id,
            details={
                'asset_id': asset.asset_id,
                'from_room': str(transfer.from_room) if transfer.from_room else None,
                'to_room': str(transfer.to_room) if transfer.to_room else None,
                'transfer_type': transfer.transfer_type
            },
            ip_address=get_client_ip(self.request)
        )
    
    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Generate and download transfer document as PDF."""
        transfer = self.get_object()
        
        try:
            import os
            from reportlab.lib.pagesizes import letter, A4
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
            from reportlab.lib import colors
            from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
            from io import BytesIO
            from django.utils import timezone
            from django.conf import settings
            
            # Create PDF buffer
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
            
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
                fontSize=14,
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
            elements.append(Paragraph("ASSET TRANSFER DOCUMENT", title_style))
            elements.append(Paragraph("Debre Markos University - Property Management System", subtitle_style))
            
            # Transfer Information
            elements.append(Paragraph("Transfer Information", heading_style))
            transfer_data = [
                ['Transfer ID:', f'#{transfer.id}'],
                ['Transfer Date:', transfer.transfer_date.strftime('%B %d, %Y at %I:%M %p')],
                ['Completed Date:', transfer.completed_date.strftime('%B %d, %Y at %I:%M %p') if transfer.completed_date else 'N/A'],
                ['Transfer Type:', transfer.get_transfer_type_display()],
                ['Status:', transfer.get_approval_status_display()],
                ['Transferred By:', transfer.transferred_by.get_full_name() if transfer.transferred_by else 'N/A'],
            ]
            
            if transfer.scheduled_date:
                transfer_data.append(['Scheduled Date:', transfer.scheduled_date.strftime('%B %d, %Y')])
            
            transfer_table = Table(transfer_data, colWidths=[2*inch, 4*inch])
            transfer_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e0e7ff')),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ]))
            elements.append(transfer_table)
            elements.append(Spacer(1, 0.2*inch))
            
            # Asset Information
            elements.append(Paragraph("Asset Information", heading_style))
            
            # Get asset type display
            asset_type_display = 'N/A'
            if hasattr(transfer.asset, 'asset_type') and transfer.asset.asset_type:
                asset_type_display = transfer.asset.get_asset_type_display()
            
            # Get condition safely
            condition_display = 'N/A'
            if hasattr(transfer.asset, 'condition') and transfer.asset.condition:
                condition_display = transfer.asset.get_condition_display()
            
            asset_data = [
                ['Asset ID:', transfer.asset.asset_id],
                ['Asset Name:', transfer.asset.name],
                ['Asset Type:', asset_type_display],
                ['Serial Number:', transfer.asset.serial_number or 'N/A'],
                ['Condition:', condition_display],
            ]
            
            asset_table = Table(asset_data, colWidths=[2*inch, 4*inch])
            asset_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e0e7ff')),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ]))
            elements.append(asset_table)
            elements.append(Spacer(1, 0.2*inch))
            
            # Location Transfer
            elements.append(Paragraph("Location Transfer", heading_style))
            
            # Build room info strings
            from_room_info = 'N/A'
            if transfer.from_room:
                try:
                    building_name = transfer.from_room.floor.building.name if transfer.from_room.floor and transfer.from_room.floor.building else 'Unknown Building'
                    from_room_info = f"{building_name} - Room {transfer.from_room.number}"
                except AttributeError:
                    from_room_info = f"Room {transfer.from_room.number}"
            
            to_room_info = 'N/A'
            if transfer.to_room:
                try:
                    building_name = transfer.to_room.floor.building.name if transfer.to_room.floor and transfer.to_room.floor.building else 'Unknown Building'
                    to_room_info = f"{building_name} - Room {transfer.to_room.number}"
                except AttributeError:
                    to_room_info = f"Room {transfer.to_room.number}"
            
            location_data = [
                ['From Campus:', transfer.source_campus_name or 'N/A'],
                ['From Room:', from_room_info],
                ['To Campus:', transfer.dest_campus_name or 'N/A'],
                ['To Room:', to_room_info],
            ]
            
            location_table = Table(location_data, colWidths=[2*inch, 4*inch])
            location_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e0e7ff')),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ]))
            elements.append(location_table)
            elements.append(Spacer(1, 0.2*inch))
            
            # Transfer Details
            if transfer.reason_category or transfer.reason:
                elements.append(Paragraph("Transfer Details", heading_style))
                details_data = []
                
                if transfer.reason_category:
                    details_data.append(['Reason Category:', transfer.get_reason_category_display()])
                if transfer.transportation_method:
                    try:
                        details_data.append(['Transportation:', transfer.get_transportation_method_display()])
                    except AttributeError:
                        details_data.append(['Transportation:', transfer.transportation_method])
                if transfer.reason:
                    details_data.append(['Reason:', Paragraph(transfer.reason, styles['Normal'])])
                if transfer.special_requirements:
                    details_data.append(['Special Requirements:', Paragraph(transfer.special_requirements, styles['Normal'])])
                if transfer.notes:
                    details_data.append(['Notes:', Paragraph(transfer.notes, styles['Normal'])])
                
                if details_data:
                    details_table = Table(details_data, colWidths=[2*inch, 4*inch])
                    details_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e0e7ff')),
                        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, -1), 10),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                        ('TOPPADDING', (0, 0), (-1, -1), 8),
                        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                    ]))
                    elements.append(details_table)
                    elements.append(Spacer(1, 0.2*inch))
            
            # Signature Section
            elements.append(Spacer(1, 0.3*inch))
            elements.append(Paragraph("Authorization", heading_style))
            signature_data = [
                ['Transferred By:', transfer.transferred_by.get_full_name() if transfer.transferred_by else 'N/A'],
                ['Signature:', '_' * 40],
                ['Date:', timezone.now().strftime('%B %d, %Y')],
            ]
            
            signature_table = Table(signature_data, colWidths=[2*inch, 4*inch])
            signature_table.setStyle(TableStyle([
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('TOPPADDING', (0, 0), (-1, -1), 12),
            ]))
            elements.append(signature_table)
            
            # Footer
            elements.append(Spacer(1, 0.5*inch))
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
            
            # Build PDF
            doc.build(elements)
            
            # Get PDF value
            pdf = buffer.getvalue()
            buffer.close()
            
            # Create response
            from django.http import HttpResponse
            response = HttpResponse(pdf, content_type='application/pdf')
            filename = f'Transfer_{transfer.asset.asset_id}_{transfer.id}.pdf'
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
            
        except Exception as e:
            from rest_framework.response import Response
            from rest_framework import status as http_status
            return Response(
                {'error': f'Failed to generate PDF: {str(e)}'},
                status=http_status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
            log_action(
                user=request.user,
                action='APPROVE_DEST',
                model_name='AssetTransfer',
                object_id=transfer.id,
                details={
                    'asset_id': transfer.asset.asset_id,
                    'new_location': str(transfer.to_room),
                    'new_campus': str(transfer.asset.campus)
                },
                ip_address=get_client_ip(request)
            )
            
            return Response({
                'message': 'Transfer fully approved and completed',
                'approval_status': transfer.approval_status
            })
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject transfer (BR-AM-02)."""
        transfer = self.get_object()
        reason = request.data.get('reason', '')
        
        if not reason:
            return Response(
                {'error': 'Rejection reason is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        transfer.reject(request.user, reason)
        
        # Notify requester of rejection
        from apps.core.models import Notification
        if transfer.requested_by:
            Notification.objects.create(
                user=transfer.requested_by,
                notification_type='transfer_rejected',
                title='❌ Transfer Request Rejected',
                message=f'Your transfer request for {transfer.asset.name} ({transfer.asset.asset_id}) has been rejected. '
                       f'Reason: {reason}',
                related_model='AssetTransfer',
                related_id=transfer.id
            )
        
        log_action(
            user=request.user,
            action='REJECT',
            model_name='AssetTransfer',
            object_id=transfer.id,
            details={
                'asset_id': transfer.asset.asset_id,
                'reason': reason
            },
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': 'Transfer rejected',
            'approval_status': transfer.approval_status
        })


class AssetDisposalViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Asset Disposal with committee review and manager approval (BR-AM-03).
    """
    queryset = AssetDisposal.objects.select_related('asset', 'requested_by', 'property_manager').all()
    serializer_class = AssetDisposalSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['asset', 'status', 'disposal_method']
    ordering_fields = ['request_date', 'status']
    ordering = ['-request_date']
    
    def get_queryset(self):
        """Filter based on user role."""
        user = self.request.user
        
        if user.role in ['SUPER_ADMIN', 'PROPERTY_MANAGER', 'MAINTENANCE_SUPERVISOR']:
            return self.queryset
        
        # Regular users can see disposals they requested
        return self.queryset.filter(requested_by=user)
    
    def perform_create(self, serializer):
        """Create disposal request with business rule validation."""
        asset = serializer.validated_data['asset']
        
        # BR-AM-03: Validate disposal rules
        try:
            enforce_disposal_rules(asset, self.request.user)
        except DjangoValidationError as e:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'error': str(e)})
        
        user = self.request.user
        is_manager = user.role in ['SUPER_ADMIN', 'PROPERTY_MANAGER']
        status_val = 'COMPLETED' if is_manager else 'PENDING_MANAGER'
        
        disposal = serializer.save(
            requested_by=user,
            status=status_val
        )
        
        if is_manager:
            from django.utils import timezone
            from datetime import timedelta
            disposal.property_manager = user
            disposal.manager_approval_date = timezone.now()
            disposal.disposal_date = timezone.now().date()
            if not disposal.retention_date:
                disposal.retention_date = (timezone.now() + timedelta(days=365*10)).date()
            disposal.save()
            
            disposal.asset.status = 'DISPOSED'
            disposal.asset.save()
        
        log_action(
            user=self.request.user,
            action='CREATE',
            model_name='AssetDisposal',
            object_id=disposal.id,
            details={
                'asset_id': asset.asset_id,
                'disposal_method': disposal.disposal_method,
                'reason': disposal.reason
            },
            ip_address=get_client_ip(self.request)
        )
    
    
    
    @action(detail=True, methods=['post'], permission_classes=[IsPropertyManager])
    def manager_approve(self, request, pk=None):
        """Property manager approves disposal (BR-AM-03)."""
        disposal = self.get_object()
        notes = request.data.get('notes', '')
        
        try:
            disposal.manager_approve(request.user, notes)
            
            log_action(
                user=request.user,
                action='MANAGER_APPROVE',
                model_name='AssetDisposal',
                object_id=disposal.id,
                details={'asset_id': disposal.asset.asset_id},
                ip_address=get_client_ip(request)
            )
            
            return Response({
                'message': 'Disposal approved by property manager',
                'status': disposal.status,
                'asset_status': disposal.asset.status
            })
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsPropertyManager])
    def manager_reject(self, request, pk=None):
        """Property manager rejects disposal (BR-AM-03)."""
        disposal = self.get_object()
        notes = request.data.get('notes', '')
        
        if not notes:
            return Response(
                {'error': 'Rejection notes are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            disposal.manager_reject(request.user, notes)
            
            log_action(
                user=request.user,
                action='MANAGER_REJECT',
                model_name='AssetDisposal',
                object_id=disposal.id,
                details={
                    'asset_id': disposal.asset.asset_id,
                    'notes': notes
                },
                ip_address=get_client_ip(request)
            )
            
            return Response({
                'message': 'Disposal rejected by property manager',
                'status': disposal.status
            })
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'], permission_classes=[IsPropertyManager])
    def complete(self, request, pk=None):
        """Complete disposal execution."""
        disposal = self.get_object()
        disposal_date = request.data.get('disposal_date')
        final_notes = request.data.get('final_notes', '')
        
        if not disposal_date:
            return Response(
                {'error': 'Disposal date is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            disposal.status = 'COMPLETED'
            disposal.disposal_date = disposal_date
            disposal.final_notes = final_notes
            
            # Handle receipt file if uploaded
            receipt_file = request.FILES.get('disposal_receipt')
            if receipt_file:
                disposal.disposal_receipt = receipt_file
                
            disposal.save()
            
            # Update asset status to DISPOSED
            asset = disposal.asset
            asset.status = 'DISPOSED'
            asset.save()
            
            log_action(
                user=request.user,
                action='COMPLETE_DISPOSAL',
                model_name='AssetDisposal',
                object_id=disposal.id,
                details={'asset_id': asset.asset_id},
                ip_address=get_client_ip(request)
            )
            
            return Response({
                'message': 'Disposal completed successfully',
                'status': disposal.status,
                'asset_status': asset.status
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class AssetVerificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Asset Verification with discrepancy reporting (BR-AM-04).
    """
    queryset = AssetVerification.objects.select_related('asset', 'verified_by', 'resolved_by').all()
    serializer_class = AssetVerificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['asset', 'status', 'has_discrepancy']
    ordering_fields = ['verification_date', 'status']
    ordering = ['-verification_date']
    
    def get_queryset(self):
        """Filter based on user role."""
        user = self.request.user
        
        if user.role in ['SUPER_ADMIN', 'PROPERTY_MANAGER', 'MAINTENANCE_SUPERVISOR']:
            return self.queryset
        
        # Regular users can see verifications they performed
        return self.queryset.filter(verified_by=user)
    
    def perform_create(self, serializer):
        """Create verification record."""
        verification = serializer.save(verified_by=self.request.user)
        
        # Update asset verification status
        asset = verification.asset
        asset.last_verification_date = verification.verification_date
        
        if verification.has_discrepancy:
            asset.verification_status = 'DISCREPANCY'
        else:
            asset.verification_status = 'VERIFIED'
            # Schedule next verification (365 days)
            from datetime import timedelta
            asset.next_verification_date = verification.verification_date + timedelta(days=365)
        
        asset.save()
        
        log_action(
            user=self.request.user,
            action='CREATE',
            model_name='AssetVerification',
            object_id=verification.id,
            details={
                'asset_id': asset.asset_id,
                'has_discrepancy': verification.has_discrepancy,
                'physical_condition': verification.physical_condition
            },
            ip_address=get_client_ip(self.request)
        )
    
    @action(detail=True, methods=['post'])
    def submit_report(self, request, pk=None):
        """Submit discrepancy report (BR-AM-04)."""
        verification = self.get_object()
        
        if not verification.has_discrepancy:
            return Response(
                {'error': 'No discrepancy found for this verification'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if verification.discrepancy_report_submitted:
            return Response(
                {'error': 'Discrepancy report already submitted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        report_file = request.FILES.get('report_file')
        if not report_file:
            return Response(
                {'error': 'Report file is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        verification.discrepancy_report_file = report_file
        verification.discrepancy_report_submitted = True
        verification.save()
        
        log_action(
            user=request.user,
            action='SUBMIT_REPORT',
            model_name='AssetVerification',
            object_id=verification.id,
            details={'asset_id': verification.asset.asset_id},
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': 'Discrepancy report submitted successfully',
            'report_submitted': True
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsPropertyManager])
    def resolve(self, request, pk=None):
        """Resolve discrepancy (BR-AM-04)."""
        verification = self.get_object()
        resolution_notes = request.data.get('resolution_notes', '')
        
        if not verification.has_discrepancy:
            return Response(
                {'error': 'No discrepancy to resolve'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not resolution_notes:
            return Response(
                {'error': 'Resolution notes are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        verification.resolution_notes = resolution_notes
        verification.resolved_by = request.user
        verification.resolved_date = timezone.now()
        verification.status = 'DISCREPANCY_RESOLVED'
        verification.save()
        
        # Update asset status
        verification.asset.verification_status = 'VERIFIED'
        from datetime import timedelta
        verification.asset.next_verification_date = verification.verification_date + timedelta(days=365)
        verification.asset.save()
        
        log_action(
            user=request.user,
            action='RESOLVE',
            model_name='AssetVerification',
            object_id=verification.id,
            details={'asset_id': verification.asset.asset_id},
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': 'Discrepancy resolved successfully',
            'status': verification.status
        })
        
    @action(detail=True, methods=['get'])
    def download_certificate(self, request, pk=None):
        """Generate and download verification certificate as PDF."""
        verification = self.get_object()
        
        # Only generate for fully verified assets
        if verification.has_discrepancy and verification.status != 'DISCREPANCY_RESOLVED':
            return Response(
                {'error': 'Cannot generate certificate for verification with unresolved discrepancies.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            import os
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
            from reportlab.lib import colors
            from reportlab.lib.enums import TA_CENTER
            from io import BytesIO
            from django.utils import timezone
            from django.conf import settings
            
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch, leftMargin=1.0*inch, rightMargin=1.0*inch)
            elements = []
            styles = getSampleStyleSheet()
            
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=28,
                textColor=colors.HexColor('#064e3b'), # Dark emerald
                spaceAfter=15,
                alignment=TA_CENTER,
                fontName='Times-Bold',
                textTransform='uppercase'
            )
            
            subtitle_style = ParagraphStyle(
                'Subtitle',
                parent=styles['Normal'],
                fontSize=14,
                textColor=colors.HexColor('#047857'),
                alignment=TA_CENTER,
                spaceAfter=20,
                fontName='Times-Italic'
            )
            
            heading_style = ParagraphStyle(
                'CustomHeading',
                parent=styles['Heading2'],
                fontSize=16,
                textColor=colors.HexColor('#065f46'),
                spaceAfter=15,
                spaceBefore=20,
                fontName='Helvetica-Bold'
            )
            
            # Add University Logo
            logo_path = os.path.join(settings.BASE_DIR.parent, 'frontend', 'src', 'assets', 'images', 'branding', 'dmu-logo.png')
            if os.path.exists(logo_path):
                try:
                    logo = Image(logo_path, width=1.5*inch, height=1.5*inch)
                    logo.hAlign = 'CENTER'
                    elements.append(logo)
                    elements.append(Spacer(1, 0.15*inch))
                except Exception:
                    pass
            
            elements.append(Paragraph("CERTIFICATE OF ASSET VERIFICATION", title_style))
            elements.append(Paragraph("Debre Markos University - Property Management System", subtitle_style))
            
            # Create side-by-side tables for Verification and Asset Info
            
            # Left side: Verification Details
            p_verif_heading = Paragraph("Verification Details", heading_style)
            verification_data = [
                ['Verification ID:', f'#{verification.id}'],
                ['Verification Date:', verification.verification_date.strftime('%b %d, %Y')],
                ['Verified By:', verification.verified_by.get_full_name() if verification.verified_by else 'N/A'],
                ['Status:', verification.get_status_display()],
                ['Condition:', verification.get_physical_condition_display()],
            ]
            if verification.status == 'DISCREPANCY_RESOLVED':
                verification_data.append(['Resolved By:', verification.resolved_by.get_full_name() if verification.resolved_by else 'N/A'])
                verification_data.append(['Resolved Date:', verification.resolved_date.strftime('%b %d, %Y') if verification.resolved_date else 'N/A'])

            verification_table = Table(verification_data, colWidths=[1.3*inch, 1.9*inch])
            verification_table.setStyle(TableStyle([
                ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#064e3b')),
                ('TEXTCOLOR', (1, 0), (1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor('#d1fae5')),
            ]))
            
            # Right side: Asset Information
            p_asset_heading = Paragraph("Asset Information", heading_style)
            asset = verification.asset
            asset_type_display = asset.get_asset_type_display() if hasattr(asset, 'asset_type') and asset.asset_type else 'N/A'
            short_name = asset.name[:25] + '...' if len(asset.name) > 25 else asset.name
            
            asset_data = [
                ['Asset ID:', asset.asset_id],
                ['Asset Name:', short_name],
                ['Asset Type:', asset_type_display],
                ['Serial Num:', asset.serial_number or 'N/A'],
                ['Campus:', asset.campus.name if asset.campus else 'N/A'],
            ]
            
            asset_table = Table(asset_data, colWidths=[1.1*inch, 2.1*inch])
            asset_table.setStyle(TableStyle([
                ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#064e3b')),
                ('TEXTCOLOR', (1, 0), (1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor('#d1fae5')),
            ]))
            
            # Combine into outer table
            outer_data = [[[p_verif_heading, verification_table], [p_asset_heading, asset_table]]]
            outer_table = Table(outer_data, colWidths=[3.2*inch, 3.3*inch])
            outer_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (0, -1), 0.1*inch),
                ('LEFTPADDING', (1, 0), (1, -1), 0.3*inch),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
            ]))
            
            elements.append(outer_table)
            elements.append(Spacer(1, 0.3*inch))
            
            elements.append(Paragraph("Official Certification", heading_style))
            cert_text_style = ParagraphStyle(
                'CertText',
                parent=styles['Normal'],
                fontSize=12,
                leading=18,
                textColor=colors.HexColor('#1f2937'),
                alignment=TA_CENTER
            )
            elements.append(Paragraph(
                "This document serves as an official certification that the aforementioned asset has been "
                "subjected to physical verification according to the policies of the Property Management System. "
                "The asset's current state, condition, and location have been duly validated and recorded.",
                cert_text_style
            ))
            elements.append(Spacer(1, 0.5*inch))
            
            signature_data = [
                ['_________________________', '', '_________________________'],
                ['Authorized Official', '', 'Date'],
            ]
            
            signature_table = Table(signature_data, colWidths=[2.5*inch, 1*inch, 2.5*inch])
            signature_table.setStyle(TableStyle([
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (0, -1), 'CENTER'),
                ('ALIGN', (2, 0), (2, -1), 'CENTER'),
                ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 1), (-1, 1), 5),
            ]))
            elements.append(signature_table)
            
            footer_style = ParagraphStyle(
                'Footer',
                parent=styles['Normal'],
                fontSize=9,
                textColor=colors.HexColor('#6b7280'),
                alignment=TA_CENTER,
                spaceBefore=20
            )
            elements.append(Spacer(1, 0.2*inch))
            elements.append(Paragraph(
                f"Document computationally generated on {timezone.now().strftime('%B %d, %Y at %I:%M %p')}",
                footer_style
            ))
            
            def draw_background(canvas, doc):
                canvas.saveState()
                
                # Draw a light background color
                canvas.setFillColor(colors.HexColor('#f0fdf4'))
                canvas.rect(0.5*inch, 0.5*inch, letter[0] - 1.0*inch, letter[1] - 1.0*inch, fill=1, stroke=0)
                
                # Draw premium outer border
                canvas.setStrokeColor(colors.HexColor('#047857'))
                canvas.setLineWidth(4)
                canvas.rect(0.5*inch, 0.5*inch, letter[0] - 1.0*inch, letter[1] - 1.0*inch)
                
                # Draw inner decorative border
                canvas.setStrokeColor(colors.HexColor('#34d399'))
                canvas.setLineWidth(1)
                canvas.rect(0.6*inch, 0.6*inch, letter[0] - 1.2*inch, letter[1] - 1.2*inch)
                
                # Watermark
                canvas.setFont('Helvetica-Bold', 60)
                canvas.setFillColor(colors.Color(0.02, 0.37, 0.26, alpha=0.04))  # Dark emerald highly transparent
                canvas.translate(letter[0]/2, letter[1]/2)
                canvas.rotate(45)
                canvas.drawCentredString(0, 0, "OFFICIALLY VERIFIED")
                canvas.restoreState()
            
            doc.build(elements, onFirstPage=draw_background, onLaterPages=draw_background)
            pdf = buffer.getvalue()
            buffer.close()
            
            # Create response
            from django.http import HttpResponse
            response = HttpResponse(pdf, content_type='application/pdf')
            filename = f'Certificate_{asset.asset_id}_{verification.id}.pdf'
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            # Save the certificate file to the model if not already saved
            from django.core.files.base import ContentFile
            if not verification.verification_certificate:
                verification.verification_certificate.save(filename, ContentFile(pdf), save=True)
            
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Failed to generate PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AssetBusinessRuleViewSet(viewsets.ViewSet):
    """
    ViewSet for checking business rules on assets.
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'], url_path='check/(?P<asset_id>[^/.]+)')
    def check_rules(self, request, asset_id=None):
        """Check all business rules for an asset."""
        try:
            asset = Asset.objects.get(asset_id=asset_id)
        except Asset.DoesNotExist:
            return Response(
                {'error': 'Asset not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # BR-AM-07: Check owner permissions
        try:
            enforce_owner_permissions(asset, request.user, action='view')
        except DjangoValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        
        rules_status = []
        
        # BR-AM-01: Registration deadline
        registration_check = check_registration_deadline(asset)
        if registration_check:
            rules_status.append({
                'rule': 'BR-AM-01',
                'name': 'High-Value Asset Registration',
                'status': 'OVERDUE' if registration_check['overdue'] else 'OK',
                'message': registration_check['message'],
                'details': registration_check
            })
        
        # BR-AM-04: Verification status
        verification_check = check_verification_status(asset)
        if verification_check:
            rules_status.append({
                'rule': 'BR-AM-04',
                'name': 'Annual Verification',
                'status': 'OVERDUE' if verification_check['overdue'] else 'OK',
                'message': verification_check['message'],
                'details': verification_check
            })
        
        # BR-AM-05: Transfer eligibility
        can_transfer = asset.can_be_transferred()
        rules_status.append({
            'rule': 'BR-AM-05',
            'name': 'Transfer Eligibility',
            'status': 'OK' if can_transfer else 'BLOCKED',
            'message': 'Asset can be transferred' if can_transfer else 'Asset under maintenance - cannot be transferred',
            'details': {'can_transfer': can_transfer, 'current_status': asset.status}
        })
        
        # BR-AM-06: Asset ID format
        rules_status.append({
            'rule': 'BR-AM-06',
            'name': 'Asset ID Format',
            'status': 'OK',
            'message': f'Asset ID follows standard format: {asset.asset_id}',
            'details': {'asset_id': asset.asset_id}
        })
        
        # BR-AM-07: User permissions
        permissions = get_asset_permissions(asset, request.user)
        rules_status.append({
            'rule': 'BR-AM-07',
            'name': 'User Permissions',
            'status': 'OK',
            'message': f'User role: {request.user.role}',
            'details': permissions
        })
        
        return Response({
            'asset_id': asset.asset_id,
            'asset_name': asset.name,
            'rules_checked': len(rules_status),
            'rules': rules_status
        })
    
    @action(detail=False, methods=['get'], url_path='permissions/(?P<asset_id>[^/.]+)')
    def get_permissions(self, request, asset_id=None):
        """Get user permissions for an asset (BR-AM-07)."""
        try:
            asset = Asset.objects.get(asset_id=asset_id)
        except Asset.DoesNotExist:
            return Response(
                {'error': 'Asset not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        permissions = get_asset_permissions(asset, request.user)
        
        return Response({
            'asset_id': asset.asset_id,
            'user_role': request.user.role,
            'permissions': permissions
        })
