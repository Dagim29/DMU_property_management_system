"""
Performance Review Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Avg, Count, Q
from datetime import timedelta
from .review_models import PerformanceReview, ReviewTemplate
from .models import User
from apps.maintenance.models import WorkOrder, SLATracking
from apps.core.feedback_models import ServiceRating
from apps.core.permissions import IsMaintenanceSupervisor


class PerformanceReviewSerializer:
    """Serializer for PerformanceReview"""
    @staticmethod
    def serialize(review):
        return {
            'id': review.id,
            'technician': review.technician.id,
            'technician_name': review.technician.get_full_name(),
            'technician_photo': review.technician.profile_photo.url if review.technician.profile_photo else None,
            'technician_specialization': review.technician.specialization or 'GENERAL',
            'reviewer': review.reviewer.id if review.reviewer else None,
            'reviewer_name': review.reviewer.get_full_name() if review.reviewer else 'Unknown',
            'review_period_start': review.review_period_start.isoformat(),
            'review_period_end': review.review_period_end.isoformat(),
            'quality_of_work': review.quality_of_work,
            'timeliness': review.timeliness,
            'communication': review.communication,
            'professionalism': review.professionalism,
            'technical_skills': review.technical_skills,
            'teamwork': review.teamwork,
            'overall_rating': round(review.overall_rating, 2),
            'rating_category': review.get_rating_category(),
            'strengths': review.strengths,
            'areas_for_improvement': review.areas_for_improvement,
            'comments': review.comments,
            'goals': review.goals,
            'work_orders_completed': review.work_orders_completed,
            'avg_completion_time_hours': round(review.avg_completion_time_hours, 2),
            'sla_compliance_rate': round(review.sla_compliance_rate, 2),
            'customer_satisfaction_avg': round(review.customer_satisfaction_avg, 2),
            'technician_acknowledged': review.technician_acknowledged,
            'acknowledged_at': review.acknowledged_at.isoformat() if review.acknowledged_at else None,
            'technician_comments': review.technician_comments,
            'created_at': review.created_at.isoformat(),
            'updated_at': review.updated_at.isoformat(),
        }


class PerformanceReviewViewSet(viewsets.ViewSet):
    """ViewSet for managing performance reviews"""
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """List all reviews with optional filters"""
        queryset = PerformanceReview.objects.select_related(
            'technician', 'reviewer'
        ).all()
        
        # Apply filters
        technician_filter = request.GET.get('technician')
        if technician_filter:
            queryset = queryset.filter(technician_id=technician_filter)
        
        rating_filter = request.GET.get('rating')
        if rating_filter and rating_filter != 'ALL':
            if rating_filter == 'EXCELLENT':
                queryset = queryset.filter(overall_rating__gte=4.5)
            elif rating_filter == 'GOOD':
                queryset = queryset.filter(overall_rating__gte=3.5, overall_rating__lt=4.5)
            elif rating_filter == 'SATISFACTORY':
                queryset = queryset.filter(overall_rating__gte=2.5, overall_rating__lt=3.5)
            elif rating_filter == 'NEEDS_IMPROVEMENT':
                queryset = queryset.filter(overall_rating__lt=2.5)
        
        # Order by creation date
        queryset = queryset.order_by('-created_at')
        
        data = [PerformanceReviewSerializer.serialize(review) for review in queryset]
        
        return Response({
            'results': data,
            'count': len(data)
        })
    
    def retrieve(self, request, pk=None):
        """Get a single review"""
        try:
            review = PerformanceReview.objects.select_related(
                'technician', 'reviewer'
            ).get(pk=pk)
            return Response(PerformanceReviewSerializer.serialize(review))
        except PerformanceReview.DoesNotExist:
            return Response(
                {'error': 'Review not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def create(self, request):
        """Create a new performance review"""
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
            
            # Parse dates
            from datetime import datetime
            review_period_start = datetime.fromisoformat(request.data.get('review_period_start')).date()
            review_period_end = datetime.fromisoformat(request.data.get('review_period_end')).date()
            
            # Calculate metrics for the review period
            metrics = self._calculate_period_metrics(technician, review_period_start, review_period_end)
            
            # Create review
            review = PerformanceReview.objects.create(
                technician=technician,
                reviewer=request.user,
                review_period_start=review_period_start,
                review_period_end=review_period_end,
                quality_of_work=request.data.get('quality_of_work', 3),
                timeliness=request.data.get('timeliness', 3),
                communication=request.data.get('communication', 3),
                professionalism=request.data.get('professionalism', 3),
                technical_skills=request.data.get('technical_skills', 3),
                teamwork=request.data.get('teamwork', 3),
                strengths=request.data.get('strengths', ''),
                areas_for_improvement=request.data.get('areas_for_improvement', ''),
                comments=request.data.get('comments', ''),
                goals=request.data.get('goals', ''),
                work_orders_completed=metrics['work_orders_completed'],
                avg_completion_time_hours=metrics['avg_completion_time_hours'],
                sla_compliance_rate=metrics['sla_compliance_rate'],
                customer_satisfaction_avg=metrics['customer_satisfaction_avg'],
            )
            
            return Response(
                PerformanceReviewSerializer.serialize(review),
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, pk=None):
        """Update a review"""
        try:
            review = PerformanceReview.objects.get(pk=pk)
            
            # Update fields
            if 'quality_of_work' in request.data:
                review.quality_of_work = request.data['quality_of_work']
            if 'timeliness' in request.data:
                review.timeliness = request.data['timeliness']
            if 'communication' in request.data:
                review.communication = request.data['communication']
            if 'professionalism' in request.data:
                review.professionalism = request.data['professionalism']
            if 'technical_skills' in request.data:
                review.technical_skills = request.data['technical_skills']
            if 'teamwork' in request.data:
                review.teamwork = request.data['teamwork']
            if 'strengths' in request.data:
                review.strengths = request.data['strengths']
            if 'areas_for_improvement' in request.data:
                review.areas_for_improvement = request.data['areas_for_improvement']
            if 'comments' in request.data:
                review.comments = request.data['comments']
            if 'goals' in request.data:
                review.goals = request.data['goals']
            
            review.save()
            
            return Response(PerformanceReviewSerializer.serialize(review))
        except PerformanceReview.DoesNotExist:
            return Response(
                {'error': 'Review not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def destroy(self, request, pk=None):
        """Delete a review"""
        try:
            review = PerformanceReview.objects.get(pk=pk)
            review.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except PerformanceReview.DoesNotExist:
            return Response(
                {'error': 'Review not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """Technician acknowledges the review"""
        try:
            review = PerformanceReview.objects.get(pk=pk)
            
            # Only the technician can acknowledge their own review
            if request.user.id != review.technician.id:
                return Response(
                    {'error': 'Only the technician can acknowledge their review'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            comments = request.data.get('comments', '')
            review.acknowledge(comments)
            
            return Response(PerformanceReviewSerializer.serialize(review))
        except PerformanceReview.DoesNotExist:
            return Response(
                {'error': 'Review not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get review statistics"""
        technician_id = request.GET.get('technician')
        
        if technician_id:
            reviews = PerformanceReview.objects.filter(technician_id=technician_id)
        else:
            reviews = PerformanceReview.objects.all()
        
        total_reviews = reviews.count()
        
        if total_reviews == 0:
            return Response({
                'total_reviews': 0,
                'avg_overall_rating': 0,
                'rating_distribution': {},
                'category_averages': {},
            })
        
        # Calculate statistics
        stats = {
            'total_reviews': total_reviews,
            'avg_overall_rating': round(reviews.aggregate(Avg('overall_rating'))['overall_rating__avg'], 2),
            'rating_distribution': {
                'excellent': reviews.filter(overall_rating__gte=4.5).count(),
                'good': reviews.filter(overall_rating__gte=3.5, overall_rating__lt=4.5).count(),
                'satisfactory': reviews.filter(overall_rating__gte=2.5, overall_rating__lt=3.5).count(),
                'needs_improvement': reviews.filter(overall_rating__lt=2.5).count(),
            },
            'category_averages': {
                'quality_of_work': round(reviews.aggregate(Avg('quality_of_work'))['quality_of_work__avg'], 2),
                'timeliness': round(reviews.aggregate(Avg('timeliness'))['timeliness__avg'], 2),
                'communication': round(reviews.aggregate(Avg('communication'))['communication__avg'], 2),
                'professionalism': round(reviews.aggregate(Avg('professionalism'))['professionalism__avg'], 2),
                'technical_skills': round(reviews.aggregate(Avg('technical_skills'))['technical_skills__avg'], 2),
                'teamwork': round(reviews.aggregate(Avg('teamwork'))['teamwork__avg'], 2),
            },
            'acknowledged_count': reviews.filter(technician_acknowledged=True).count(),
        }
        
        return Response(stats)
    
    def _calculate_period_metrics(self, technician, start_date, end_date):
        """Calculate performance metrics for a review period"""
        from datetime import datetime
        
        # Convert dates to datetime for filtering
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())
        
        # Get work orders in period
        work_orders = WorkOrder.objects.filter(
            assigned_to=technician,
            created_at__gte=start_datetime,
            created_at__lte=end_datetime
        )
        
        completed = work_orders.filter(request__status='COMPLETED')
        work_orders_completed = completed.count()
        
        # Calculate average completion time
        avg_completion_time_hours = 0
        if work_orders_completed > 0:
            total_hours = 0
            for wo in completed:
                if wo.completed_at:
                    delta = wo.completed_at - wo.created_at
                    total_hours += delta.total_seconds() / 3600
            avg_completion_time_hours = total_hours / work_orders_completed if work_orders_completed > 0 else 0
        
        # Calculate SLA compliance
        sla_records = SLATracking.objects.filter(
            request__assigned_to=technician,
            created_at__gte=start_datetime,
            created_at__lte=end_datetime
        )
        sla_total = sla_records.count()
        sla_met = sla_records.filter(response_met=True, resolution_met=True).count()
        sla_compliance_rate = (sla_met / sla_total * 100) if sla_total > 0 else 0
        
        # Calculate customer satisfaction
        ratings = ServiceRating.objects.filter(
            maintenance_request__assigned_to=technician,
            created_at__gte=start_datetime,
            created_at__lte=end_datetime
        )
        customer_satisfaction_avg = ratings.aggregate(Avg('overall_rating'))['overall_rating__avg'] or 0
        
        return {
            'work_orders_completed': work_orders_completed,
            'avg_completion_time_hours': avg_completion_time_hours,
            'sla_compliance_rate': sla_compliance_rate,
            'customer_satisfaction_avg': customer_satisfaction_avg,
        }
