from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DashboardStatsView, AssetReportView, MaintenanceCostReportView,
    PreventiveComplianceReportView,
    ScheduledReportViewSet, GeneratedReportViewSet, MaintenanceMetricsViewSet
)

router = DefaultRouter()
router.register(r'scheduled', ScheduledReportViewSet, basename='scheduled-report')
router.register(r'generated', GeneratedReportViewSet, basename='generated-report')
router.register(r'metrics', MaintenanceMetricsViewSet, basename='maintenance-metrics')

urlpatterns = [
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('assets/', AssetReportView.as_view(), name='asset-report'),
    path('maintenance-costs/', MaintenanceCostReportView.as_view(), name='maintenance-cost-report'),
    path('preventive-compliance/', PreventiveComplianceReportView.as_view(), name='preventive-compliance-report'),
    path('', include(router.urls)),
]
