"""
URL configuration for Team Communication
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.maintenance.communication_views import (
    TeamMessageViewSet,
    TeamAnnouncementViewSet
)

router = DefaultRouter()
router.register(r'messages', TeamMessageViewSet, basename='team-message')
router.register(r'announcements', TeamAnnouncementViewSet, basename='team-announcement')

urlpatterns = [
    path('', include(router.urls)),
]
