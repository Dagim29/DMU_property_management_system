from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MaintenanceRequestViewSet, WorkOrderViewSet, PreventiveMaintenanceViewSet
from .reassignment_views import RequestReassignmentViewSet, SLATrackingViewSet
from .inventory_views import InventoryItemViewSet, PartsRequestViewSet, StockTransactionViewSet
from .analytics_views import (
    sla_monitoring_dashboard,
    advanced_analytics,
    technician_availability_dashboard,
    technician_performance_report
)

router = DefaultRouter()
router.register(r'requests', MaintenanceRequestViewSet)
router.register(r'work-orders', WorkOrderViewSet)
router.register(r'preventive', PreventiveMaintenanceViewSet)
router.register(r'reassignments', RequestReassignmentViewSet, basename='reassignment')
router.register(r'sla-tracking', SLATrackingViewSet, basename='sla-tracking')
router.register(r'inventory', InventoryItemViewSet, basename='inventory')
router.register(r'parts-requests', PartsRequestViewSet, basename='parts-request')
router.register(r'stock-transactions', StockTransactionViewSet, basename='stock-transaction')

urlpatterns = [
    path('', include(router.urls)),
    path('communication/', include('apps.maintenance.communication_urls')),
    # Analytics endpoints
    path('analytics/sla-monitoring/', sla_monitoring_dashboard, name='sla-monitoring'),
    path('analytics/advanced/', advanced_analytics, name='advanced-analytics'),
    path('analytics/technician-availability/', technician_availability_dashboard, name='technician-availability'),
    path('analytics/technician-performance/', technician_performance_report, name='technician-performance'),
]
