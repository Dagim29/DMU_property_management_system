from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuditLogViewSet, SystemSettingsViewSet, DatabaseBackupViewSet, SystemHealthViewSet, NotificationViewSet

router = DefaultRouter()
router.register(r'audit-logs', AuditLogViewSet, basename='auditlog')
router.register(r'settings', SystemSettingsViewSet, basename='systemsettings')
router.register(r'backups', DatabaseBackupViewSet, basename='databasebackup')
router.register(r'health', SystemHealthViewSet, basename='systemhealth')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]
