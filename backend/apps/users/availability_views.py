"""
Technician Availability Management Views
"""
import traceback
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import TechnicianAvailability, TechnicianShift, User
from apps.core.permissions import IsMaintenanceSupervisor


class TechnicianAvailabilitySerializer:
    """Serializer for TechnicianAvailability"""
    @staticmethod
    def serialize(availability):
        return {
            'id': availability.id,
            'technician': availability.technician.id,
            'technician_name': availability.technician.get_full_name(),
            'status': availability.status,
            'start_date': availability.start_date.isoformat(),
            'end_date': availability.end_date.isoformat(),
            'reason': availability.reason,
            'notes': availability.notes,
            'approved': availability.approved,
            'approved_by': availability.approved_by.id if availability.approved_by else None,
            'approved_by_name': availability.approved_by.get_full_name() if availability.approved_by else None,
            'approved_at': availability.approved_at.isoformat() if availability.approved_at else None,
            'is_active': availability.is_active(),
            'created_at': availability.created_at.isoformat(),
            'updated_at': availability.updated_at.isoformat(),
        }


class TechnicianAvailabilityViewSet(viewsets.ViewSet):
    """ViewSet for managing technician availability"""
    permission_classes = [IsAuthenticated, IsMaintenanceSupervisor]
    
    def list(self, request):
        """List all availability records with optional filters"""
        queryset = TechnicianAvailability.objects.select_related(
            'technician', 'approved_by'
        ).all()
        
        # Apply filters
        status_filter = request.GET.get('status')
        if status_filter and status_filter != 'ALL':
            queryset = queryset.filter(status=status_filter)
        
        technician_filter = request.GET.get('technician')
        if technician_filter:
            queryset = queryset.filter(technician_id=technician_filter)
        
        # Order by start date descending
        queryset = queryset.order_by('-start_date')
        
        data = [TechnicianAvailabilitySerializer.serialize(avail) for avail in queryset]
        
        return Response({
            'results': data,
            'count': len(data)
        })
    
    def retrieve(self, request, pk=None):
        """Get a single availability record"""
        try:
            availability = TechnicianAvailability.objects.select_related(
                'technician', 'approved_by'
            ).get(pk=pk)
            return Response(TechnicianAvailabilitySerializer.serialize(availability))
        except TechnicianAvailability.DoesNotExist:
            return Response(
                {'error': 'Availability record not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def create(self, request):
        """Create a new availability record"""
        try:
            technician_id = request.data.get('technician')
            if not technician_id:
                return Response(
                    {'error': 'technician is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                technician = User.objects.get(
                    id=technician_id,
                    role='MAINTENANCE_TECHNICIAN'
                )
            except User.DoesNotExist:
                return Response(
                    {'error': 'Technician not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            start_date = request.data.get('start_date')
            end_date = request.data.get('end_date')
            
            if not start_date:
                return Response(
                    {'error': 'start_date is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if not end_date:
                return Response(
                    {'error': 'end_date is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            from datetime import date as date_type
            try:
                start_date_obj = date_type.fromisoformat(start_date)
                end_date_obj = date_type.fromisoformat(end_date)
            except ValueError:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if end_date_obj < start_date_obj:
                return Response(
                    {'error': 'end_date must be on or after start_date'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            availability = TechnicianAvailability.objects.create(
                technician=technician,
                status=request.data.get('status', 'ON_LEAVE'),
                start_date=start_date_obj,
                end_date=end_date_obj,
                reason=request.data.get('reason', ''),
                notes=request.data.get('notes', ''),
                approved=False
            )
            
            return Response(
                TechnicianAvailabilitySerializer.serialize(availability),
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, pk=None):
        """Update an availability record"""
        try:
            availability = TechnicianAvailability.objects.get(pk=pk)
            
            if 'status' in request.data:
                availability.status = request.data['status']
            if 'start_date' in request.data:
                availability.start_date = request.data['start_date']
            if 'end_date' in request.data:
                availability.end_date = request.data['end_date']
            if 'reason' in request.data:
                availability.reason = request.data['reason']
            if 'notes' in request.data:
                availability.notes = request.data['notes']
            
            availability.save()
            
            return Response(TechnicianAvailabilitySerializer.serialize(availability))
        except TechnicianAvailability.DoesNotExist:
            return Response(
                {'error': 'Availability record not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def destroy(self, request, pk=None):
        """Delete an availability record"""
        try:
            availability = TechnicianAvailability.objects.get(pk=pk)
            availability.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except TechnicianAvailability.DoesNotExist:
            return Response(
                {'error': 'Availability record not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve an availability request"""
        try:
            availability = TechnicianAvailability.objects.get(pk=pk)
            availability.approve(request.user)
            return Response(TechnicianAvailabilitySerializer.serialize(availability))
        except TechnicianAvailability.DoesNotExist:
            return Response(
                {'error': 'Availability record not found'},
                status=status.HTTP_404_NOT_FOUND
            )



class TechnicianShiftSerializer:
    """Serializer for TechnicianShift"""
    @staticmethod
    def serialize(shift):
        return {
            'id': shift.id,
            'technician': shift.technician.id,
            'technician_name': shift.technician.get_full_name(),
            'day_of_week': shift.day_of_week,
            'day_of_week_display': shift.get_day_of_week_display(),
            'shift_type': shift.shift_type,
            'shift_type_display': shift.get_shift_type_display(),
            'start_time': shift.start_time.strftime('%H:%M'),
            'end_time': shift.end_time.strftime('%H:%M'),
            'is_active': shift.is_active,
            'created_at': shift.created_at.isoformat(),
            'updated_at': shift.updated_at.isoformat(),
        }


class TechnicianShiftViewSet(viewsets.ViewSet):
    """ViewSet for managing technician shifts"""
    permission_classes = [IsAuthenticated, IsMaintenanceSupervisor]
    
    def list(self, request):
        """List all shift records with optional filters"""
        queryset = TechnicianShift.objects.select_related('technician').all()
        
        # Apply filters
        technician_filter = request.GET.get('technician')
        if technician_filter:
            queryset = queryset.filter(technician_id=technician_filter)
        
        day_filter = request.GET.get('day')
        if day_filter:
            queryset = queryset.filter(day_of_week=day_filter)
        
        is_active = request.GET.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Order by day and time
        queryset = queryset.order_by('day_of_week', 'start_time')
        
        data = [TechnicianShiftSerializer.serialize(shift) for shift in queryset]
        
        return Response({
            'results': data,
            'count': len(data)
        })
    
    def retrieve(self, request, pk=None):
        """Get a single shift record"""
        try:
            shift = TechnicianShift.objects.select_related('technician').get(pk=pk)
            return Response(TechnicianShiftSerializer.serialize(shift))
        except TechnicianShift.DoesNotExist:
            return Response(
                {'error': 'Shift record not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def create(self, request):
        """Create a new shift record"""
        try:
            technician_id = request.data.get('technician')
            if not technician_id:
                return Response(
                    {'error': 'technician is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                technician = User.objects.get(
                    id=technician_id,
                    role='MAINTENANCE_TECHNICIAN'
                )
            except User.DoesNotExist:
                return Response(
                    {'error': 'Technician not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Parse time strings
            from datetime import datetime
            start_time = datetime.strptime(request.data.get('start_time'), '%H:%M').time()
            end_time = datetime.strptime(request.data.get('end_time'), '%H:%M').time()
            
            shift = TechnicianShift.objects.create(
                technician=technician,
                day_of_week=request.data.get('day_of_week'),
                shift_type=request.data.get('shift_type', 'FULL_DAY'),
                start_time=start_time,
                end_time=end_time,
                is_active=request.data.get('is_active', True)
            )
            
            return Response(
                TechnicianShiftSerializer.serialize(shift),
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, pk=None):
        """Update a shift record"""
        try:
            shift = TechnicianShift.objects.get(pk=pk)
            
            if 'day_of_week' in request.data:
                shift.day_of_week = request.data['day_of_week']
            if 'shift_type' in request.data:
                shift.shift_type = request.data['shift_type']
            if 'start_time' in request.data:
                from datetime import datetime
                shift.start_time = datetime.strptime(request.data['start_time'], '%H:%M').time()
            if 'end_time' in request.data:
                from datetime import datetime
                shift.end_time = datetime.strptime(request.data['end_time'], '%H:%M').time()
            if 'is_active' in request.data:
                shift.is_active = request.data['is_active']
            
            shift.save()
            
            return Response(TechnicianShiftSerializer.serialize(shift))
        except TechnicianShift.DoesNotExist:
            return Response(
                {'error': 'Shift record not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def destroy(self, request, pk=None):
        """Delete a shift record"""
        try:
            shift = TechnicianShift.objects.get(pk=pk)
            shift.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except TechnicianShift.DoesNotExist:
            return Response(
                {'error': 'Shift record not found'},
                status=status.HTTP_404_NOT_FOUND
            )
