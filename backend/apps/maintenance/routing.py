"""
Automatic routing logic for maintenance requests.
Routes requests to appropriate technicians based on:
1. Category/Specialization match       (40 points)
2. Campus/Location proximity           (25 points)
3. Performance score from ratings      (20 points)
4. Current workload (inverse)          (15 points)

Disqualifiers:
- Technician is on leave / unavailable
- Technician is at max capacity (>= 10 active requests)
"""
from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Avg
from django.utils import timezone
from .models import MaintenanceRequest

User = get_user_model()

MAX_ACTIVE_REQUESTS = 10  # Hard cap per technician


def _is_technician_available(technician):
    """
    Check if a technician is currently available (not on leave/vacation).
    Returns True if available, False if on leave.
    """
    try:
        from apps.users.models import TechnicianAvailability
        today = timezone.now().date()
        on_leave = TechnicianAvailability.objects.filter(
            technician=technician,
            start_date__lte=today,
            end_date__gte=today,
            approved=True,
            status__in=['ON_LEAVE', 'SICK_LEAVE', 'VACATION']
        ).exists()
        return not on_leave
    except Exception:
        return True  # If we can't check, assume available


def _score_technician(technician, category, campus_name, active_count):
    """
    Calculate a composite score for a technician for a given request.

    Scoring breakdown (max 100):
      - Specialization match:  40 pts (exact) / 20 pts (general) / 0 pts (other)
      - Campus match:          25 pts (same campus) / 10 pts (no campus set)
      - Performance score:     up to 20 pts (performance_score / 5)
      - Workload:              up to 15 pts (decreases with more active requests)
    """
    score = 0
    reasons = []

    # 1. Specialization match (40 pts)
    if technician.specialization == category:
        score += 40
        reasons.append(f"Specialization match ({category})")
    elif technician.specialization in ('GENERAL', '') or not technician.specialization:
        score += 20
        reasons.append("General maintenance")
    else:
        score += 0
        reasons.append(f"Different specialization ({technician.specialization or 'None'})")

    # 2. Campus match (25 pts)
    if campus_name and technician.assigned_campus == campus_name:
        score += 25
        reasons.append(f"Same campus ({campus_name})")
    elif not technician.assigned_campus:
        score += 10
        reasons.append("No campus restriction")
    else:
        reasons.append(f"Different campus ({technician.assigned_campus})")

    # 3. Performance score from ratings (20 pts max)
    # performance_score is 0-100, scale to 0-20
    perf_pts = round((technician.performance_score / 100) * 20, 1)
    score += perf_pts
    if technician.total_ratings > 0:
        reasons.append(f"Rating score: {technician.performance_score:.0f}/100 ({technician.total_ratings} ratings)")
    else:
        reasons.append("No ratings yet")

    # 4. Workload (15 pts max, -3 per active request)
    workload_pts = max(0, 15 - (active_count * 3))
    score += workload_pts
    reasons.append(f"{active_count} active request(s)")

    return round(score, 1), " | ".join(reasons)


def auto_assign_request(maintenance_request):
    """
    Automatically assign a maintenance request to the best available technician
    using a weighted scoring algorithm.

    Returns:
        User: The assigned technician, or None if no suitable technician found
    """
    category = maintenance_request.category
    asset = maintenance_request.asset
    campus_name = asset.campus.name if asset and asset.campus else None

    # Get all active maintenance technicians with workload annotation
    technicians = User.objects.filter(
        role='MAINTENANCE_TECHNICIAN',
        is_active=True
    ).annotate(
        active_requests=Count(
            'assigned_requests',
            filter=Q(
                assigned_requests__status__in=['ASSIGNED', 'IN_PROGRESS', 'WAITING_PARTS']
            )
        )
    )

    if not technicians.exists():
        return None

    best_technician = None
    best_score = -1

    for tech in technicians:
        # Skip technicians at max capacity
        if tech.active_requests >= MAX_ACTIVE_REQUESTS:
            continue

        # Skip technicians on leave
        if not _is_technician_available(tech):
            continue

        score, _ = _score_technician(tech, category, campus_name, tech.active_requests)

        if score > best_score:
            best_score = score
            best_technician = tech

    return best_technician


def get_routing_explanation(maintenance_request, assigned_technician):
    """
    Generate a detailed explanation of why a technician was assigned.
    """
    if not assigned_technician:
        return "No suitable technician available"

    category = maintenance_request.category
    campus_name = (
        maintenance_request.asset.campus.name
        if maintenance_request.asset and maintenance_request.asset.campus
        else "Unknown"
    )

    active_count = MaintenanceRequest.objects.filter(
        assigned_to=assigned_technician,
        status__in=['ASSIGNED', 'IN_PROGRESS', 'WAITING_PARTS']
    ).count()

    score, explanation = _score_technician(
        assigned_technician, category, campus_name, active_count
    )

    return f"Score: {score}/100 | {explanation}"


def suggest_technicians(maintenance_request, limit=10):
    """
    Get a ranked list of suggested technicians using the scoring algorithm.
    Returns list of dicts with technician, score, explanation, active_requests.
    """
    category = maintenance_request.category
    campus_name = (
        maintenance_request.asset.campus.name
        if maintenance_request.asset and maintenance_request.asset.campus
        else None
    )

    technicians = User.objects.filter(
        role='MAINTENANCE_TECHNICIAN',
        is_active=True
    ).annotate(
        active_requests=Count(
            'assigned_requests',
            filter=Q(
                assigned_requests__status__in=['ASSIGNED', 'IN_PROGRESS', 'WAITING_PARTS']
            )
        )
    )

    suggestions = []

    for tech in technicians:
        available = _is_technician_available(tech)
        at_capacity = tech.active_requests >= MAX_ACTIVE_REQUESTS

        score, explanation = _score_technician(
            tech, category, campus_name, tech.active_requests
        )

        if at_capacity:
            explanation = f"⚠ At capacity ({tech.active_requests} active) | " + explanation
        if not available:
            explanation = "⚠ Currently on leave | " + explanation

        suggestions.append({
            'technician': tech,
            'score': score,
            'explanation': explanation,
            'active_requests': tech.active_requests,
            'available': available,
            'at_capacity': at_capacity,
        })

    # Sort: available + not at capacity first, then by score descending
    suggestions.sort(key=lambda x: (
        0 if (x['available'] and not x['at_capacity']) else 1,
        -x['score']
    ))

    return suggestions[:limit]
