from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (CampusViewSet, BuildingViewSet, FloorViewSet, RoomViewSet, AssetViewSet,
                    AssetWarrantyViewSet, AssetInsuranceViewSet, AssetCheckoutViewSet, AssetDocumentViewSet,
                    BudgetViewSet, BudgetTransactionViewSet, CheckoutExtensionRequestViewSet)
from .business_rule_views import (AssetTransferViewSet, AssetDisposalViewSet, 
                                   AssetVerificationViewSet, AssetBusinessRuleViewSet)
from .export_views import export_assets, download_template
from .predictive_views import (
    predictive_summary,
    assets_at_risk,
    asset_risk_detail,
    risk_trends
)
from .assignment_views import (
    AssetAssignmentRequestViewSet,
    AssetAvailabilityViewSet,
    WaitlistViewSet
)
from .extension_views import AssignmentExtensionViewSet

router = DefaultRouter()
router.register(r'campuses', CampusViewSet)
router.register(r'buildings', BuildingViewSet)
router.register(r'floors', FloorViewSet)
router.register(r'rooms', RoomViewSet)
router.register(r'assets', AssetViewSet, basename='asset')
router.register(r'transfers', AssetTransferViewSet)
router.register(r'disposals', AssetDisposalViewSet)
router.register(r'verifications', AssetVerificationViewSet)
router.register(r'business-rules', AssetBusinessRuleViewSet, basename='business-rule')
router.register(r'warranties', AssetWarrantyViewSet)
router.register(r'insurance', AssetInsuranceViewSet)
router.register(r'checkouts', AssetCheckoutViewSet)
router.register(r'extension-requests', CheckoutExtensionRequestViewSet)
router.register(r'documents', AssetDocumentViewSet)
router.register(r'budgets', BudgetViewSet)
router.register(r'budget-transactions', BudgetTransactionViewSet)
# Asset Assignment Request System
router.register(r'asset-requests', AssetAssignmentRequestViewSet, basename='asset-request')
router.register(r'asset-availability', AssetAvailabilityViewSet, basename='asset-availability')
router.register(r'waitlist', WaitlistViewSet, basename='waitlist')
router.register(r'assignment-extensions', AssignmentExtensionViewSet, basename='assignment-extension')

urlpatterns = [
    path('export/', export_assets, name='asset-export'),
    path('download-template/', download_template, name='download-template'),
    # Predictive Maintenance endpoints
    path('predictive/summary/', predictive_summary, name='predictive-summary'),
    path('predictive/at-risk/', assets_at_risk, name='assets-at-risk'),
    path('predictive/risk-detail/<str:asset_id>/', asset_risk_detail, name='asset-risk-detail'),
    path('predictive/trends/', risk_trends, name='risk-trends'),
    path('', include(router.urls)),
]
