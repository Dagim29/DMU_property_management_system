"""URL configuration for Technician Portal."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .technician_views import (
    TechnicianDashboardViewSet,
    TechnicianWorkOrdersViewSet,
    TechnicianScheduleViewSet,
    TechnicianPerformanceViewSet,
    TimeTrackingViewSet
)

router = DefaultRouter()
router.register(r'dashboard', TechnicianDashboardViewSet, basename='technician-dashboard')
router.register(r'work-orders', TechnicianWorkOrdersViewSet, basename='technician-work-orders')
router.register(r'schedule', TechnicianScheduleViewSet, basename='technician-schedule')
router.register(r'performance', TechnicianPerformanceViewSet, basename='technician-performance')
router.register(r'time-tracking', TimeTrackingViewSet, basename='time-tracking')

urlpatterns = [
    path('', include(router.urls)),
]
