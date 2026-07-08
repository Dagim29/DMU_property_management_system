"""Signals for automatic technician score calculation."""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg


def recalculate_technician_score(technician):
    """
    Recalculate and save a technician's performance score based on all their ratings.
    
    Score formula:
      - Average of overall_rating across all received ratings, scaled to 0-100
      - Each star = 20 points (5 stars = 100 points)
    """
    from apps.core.feedback_models import ServiceRating

    ratings = ServiceRating.objects.filter(
        maintenance_request__assigned_to=technician
    )

    count = ratings.count()
    if count == 0:
        technician.performance_score = 0.0
        technician.total_ratings = 0
    else:
        avg = ratings.aggregate(avg=Avg('overall_rating'))['avg'] or 0
        # Scale 1-5 stars to 0-100 points
        technician.performance_score = round((avg / 5) * 100, 1)
        technician.total_ratings = count

    technician.save(update_fields=['performance_score', 'total_ratings'])


@receiver(post_save, sender='core.ServiceRating')
def on_rating_saved(sender, instance, created, **kwargs):
    """Update technician score whenever a rating is created or updated."""
    technician = instance.maintenance_request.assigned_to
    if technician and technician.role == 'MAINTENANCE_TECHNICIAN':
        recalculate_technician_score(technician)


@receiver(post_delete, sender='core.ServiceRating')
def on_rating_deleted(sender, instance, **kwargs):
    """Update technician score when a rating is deleted."""
    technician = instance.maintenance_request.assigned_to
    if technician and technician.role == 'MAINTENANCE_TECHNICIAN':
        recalculate_technician_score(technician)
