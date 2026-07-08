from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import UserViewSet
from .auth_views import login_view, logout_view, profile_view
from .security_views import (
    UserSessionViewSet, 
    SecurityAlertViewSet,
    IPAccessControlViewSet,
    FailedLoginAttemptViewSet,
    SecurityAuditViewSet
)
from .availability_views import TechnicianAvailabilityViewSet, TechnicianShiftViewSet
from .review_views import PerformanceReviewViewSet
from .two_fa_views import (
    enable_2fa,
    verify_and_enable_2fa,
    disable_2fa,
    verify_2fa_code,
    get_2fa_status,
    regenerate_backup_codes,
    admin_toggle_user_2fa
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'sessions', UserSessionViewSet, basename='session')
router.register(r'security-alerts', SecurityAlertViewSet, basename='security-alert')
router.register(r'ip-control', IPAccessControlViewSet, basename='ip-control')
router.register(r'failed-logins', FailedLoginAttemptViewSet, basename='failed-login')
router.register(r'security-audit', SecurityAuditViewSet, basename='security-audit')
router.register(r'availability', TechnicianAvailabilityViewSet, basename='availability')
router.register(r'shifts', TechnicianShiftViewSet, basename='shift')
router.register(r'performance-reviews', PerformanceReviewViewSet, basename='performance-review')

urlpatterns = [
    path('auth/login/', login_view, name='login'),
    path('auth/logout/', logout_view, name='logout'),
    path('auth/profile/', profile_view, name='profile'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # 2FA endpoints
    path('2fa/enable/', enable_2fa, name='2fa-enable'),
    path('2fa/verify-enable/', verify_and_enable_2fa, name='2fa-verify-enable'),
    path('2fa/disable/', disable_2fa, name='2fa-disable'),
    path('2fa/verify/', verify_2fa_code, name='2fa-verify'),
    path('2fa/status/', get_2fa_status, name='2fa-status'),
    path('2fa/backup-codes/regenerate/', regenerate_backup_codes, name='2fa-regenerate-backup'),
    path('2fa/admin/toggle/<int:user_id>/', admin_toggle_user_2fa, name='2fa-admin-toggle'),
    
    path('', include(router.urls)),
]

