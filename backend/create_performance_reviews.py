"""
Create sample performance reviews
"""
import os
import django
from datetime import timedelta
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import timezone
from apps.users.models import User
from apps.users.review_models import PerformanceReview

def create_reviews():
    """Create sample performance reviews"""
    
    print("Creating Performance Reviews...")
    print("=" * 60)
    
    # Get technicians and supervisors
    technicians = User.objects.filter(role='MAINTENANCE_TECHNICIAN')
    supervisors = User.objects.filter(role='MAINTENANCE_SUPERVISOR')
    
    if not supervisors.exists():
        print("⚠ No supervisors found")
        return
    
    supervisor = supervisors.first()
    
    print(f"\nFound {technicians.count()} technicians")
    print(f"Reviewer: {supervisor.get_full_name()}\n")
    
    created_count = 0
    
    # Create reviews for some technicians
    for i, tech in enumerate(technicians[:5]):  # First 5 technicians
        # Create 1-3 reviews per technician
        num_reviews = random.randint(1, 3)
        
        for j in range(num_reviews):
            # Review period (30-90 days ago)
            days_ago = random.randint(30, 90) + (j * 30)
            review_period_end = timezone.now().date() - timedelta(days=days_ago)
            review_period_start = review_period_end - timedelta(days=30)
            
            # Check if review already exists
            existing = PerformanceReview.objects.filter(
                technician=tech,
                review_period_start=review_period_start,
                review_period_end=review_period_end
            ).first()
            
            if existing:
                print(f"⚠ Review already exists for {tech.get_full_name()} ({review_period_start} to {review_period_end})")
                continue
            
            # Generate ratings (mostly good with some variation)
            base_rating = random.choice([3, 4, 4, 4, 5, 5])  # Weighted towards 4-5
            
            quality_of_work = min(5, max(1, base_rating + random.randint(-1, 1)))
            timeliness = min(5, max(1, base_rating + random.randint(-1, 1)))
            communication = min(5, max(1, base_rating + random.randint(-1, 1)))
            professionalism = min(5, max(1, base_rating + random.randint(-1, 1)))
            technical_skills = min(5, max(1, base_rating + random.randint(-1, 1)))
            teamwork = min(5, max(1, base_rating + random.randint(-1, 1)))
            
            # Generate feedback based on ratings
            strengths_options = [
                "Consistently delivers high-quality work",
                "Excellent problem-solving skills",
                "Strong technical expertise",
                "Great communication with team and clients",
                "Reliable and punctual",
                "Takes initiative on complex issues",
                "Mentors junior technicians effectively"
            ]
            
            improvement_options = [
                "Could improve documentation of work performed",
                "Needs to work on time management for multiple tasks",
                "Should communicate more proactively about delays",
                "Could benefit from additional training in new technologies",
                "Needs to improve follow-up on pending issues"
            ]
            
            goals_options = [
                "Complete advanced certification in specialization area",
                "Reduce average completion time by 10%",
                "Achieve 95% SLA compliance rate",
                "Mentor at least 2 junior technicians",
                "Lead a major maintenance project"
            ]
            
            strengths = ". ".join(random.sample(strengths_options, random.randint(2, 3))) + "."
            areas_for_improvement = ". ".join(random.sample(improvement_options, random.randint(1, 2))) + "." if base_rating < 5 else ""
            goals = ". ".join(random.sample(goals_options, random.randint(2, 3))) + "."
            
            comments_options = [
                "Excellent performance this period. Keep up the good work!",
                "Solid performance with room for growth in key areas.",
                "Outstanding work on emergency requests this period.",
                "Good progress on development goals from last review.",
                "Consistently meets expectations and shows initiative."
            ]
            
            comments = random.choice(comments_options)
            
            # Create review
            review = PerformanceReview.objects.create(
                technician=tech,
                reviewer=supervisor,
                review_period_start=review_period_start,
                review_period_end=review_period_end,
                quality_of_work=quality_of_work,
                timeliness=timeliness,
                communication=communication,
                professionalism=professionalism,
                technical_skills=technical_skills,
                teamwork=teamwork,
                strengths=strengths,
                areas_for_improvement=areas_for_improvement,
                comments=comments,
                goals=goals,
                work_orders_completed=random.randint(5, 25),
                avg_completion_time_hours=round(random.uniform(2.0, 8.0), 2),
                sla_compliance_rate=round(random.uniform(75.0, 98.0), 2),
                customer_satisfaction_avg=round(random.uniform(3.5, 5.0), 2),
            )
            
            # Some reviews are acknowledged
            if random.random() > 0.4:  # 60% acknowledged
                tech_comments = random.choice([
                    "Thank you for the feedback. I will work on the areas mentioned.",
                    "I appreciate the recognition and will continue to improve.",
                    "Grateful for the constructive feedback and clear goals.",
                    ""
                ])
                review.acknowledge(tech_comments)
            
            created_count += 1
            status_icon = "⭐" * int(review.overall_rating)
            print(f"✓ {tech.get_full_name()} - {review_period_start} to {review_period_end} - {status_icon} {review.overall_rating:.1f}")
    
    print("\n" + "=" * 60)
    print(f"✓ Created {created_count} performance reviews!")
    
    # Print summary
    total_reviews = PerformanceReview.objects.count()
    avg_rating = PerformanceReview.objects.aggregate(models.Avg('overall_rating'))['overall_rating__avg']
    acknowledged = PerformanceReview.objects.filter(technician_acknowledged=True).count()
    
    print(f"\nSummary:")
    print(f"  Total Reviews: {total_reviews}")
    print(f"  Average Rating: {avg_rating:.2f}/5.00")
    print(f"  Acknowledged: {acknowledged} ({round(acknowledged/total_reviews*100, 1)}%)")
    
    # Rating distribution
    excellent = PerformanceReview.objects.filter(overall_rating__gte=4.5).count()
    good = PerformanceReview.objects.filter(overall_rating__gte=3.5, overall_rating__lt=4.5).count()
    satisfactory = PerformanceReview.objects.filter(overall_rating__gte=2.5, overall_rating__lt=3.5).count()
    needs_improvement = PerformanceReview.objects.filter(overall_rating__lt=2.5).count()
    
    print(f"\nRating Distribution:")
    print(f"  Excellent (4.5-5.0): {excellent}")
    print(f"  Good (3.5-4.4): {good}")
    print(f"  Satisfactory (2.5-3.4): {satisfactory}")
    print(f"  Needs Improvement (<2.5): {needs_improvement}")

if __name__ == '__main__':
    from django.db import models
    create_reviews()
