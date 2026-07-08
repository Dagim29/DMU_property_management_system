"""URL configuration for Owner Portal."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .owner_views import (
    OwnerDashboardViewSet,
    MyAssetsViewSet,
    MyCheckoutsViewSet,
    MyMaintenanceRequestsViewSet,
    AssetHistoryViewSet,
    QRScannerViewSet,
    QRCodeGeneratorViewSet,
    FeedbackViewSet
)

router = DefaultRouter()
router.register(r'dashboard', OwnerDashboardViewSet, basename='owner-dashboard')
router.register(r'my-assets', MyAssetsViewSet, basename='my-assets')
router.register(r'my-checkouts', MyCheckoutsViewSet, basename='my-checkouts')
router.register(r'my-requests', MyMaintenanceRequestsViewSet, basename='my-requests')
router.register(r'qr', QRScannerViewSet, basename='qr-scanner')
router.register(r'qr-generate', QRCodeGeneratorViewSet, basename='qr-generate')
router.register(r'feedback', FeedbackViewSet, basename='feedback')

urlpatterns = [
    path('', include(router.urls)),
    path('my-assets/<int:asset_pk>/history/', AssetHistoryViewSet.as_view({'get': 'list'}), name='asset-history-list'),
    path('my-assets/<int:asset_pk>/history/timeline/', AssetHistoryViewSet.as_view({'get': 'timeline'}), name='asset-history-timeline'),
    path('my-assets/<int:asset_pk>/history/export/', AssetHistoryViewSet.as_view({'get': 'export'}), name='asset-history-export'),
]
