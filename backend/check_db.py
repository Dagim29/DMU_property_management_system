import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.assets.extension_models import AssignmentExtensionRequest
from apps.core.models import Notification
from django.db.models import Count

print(f"Total Extension Requests: {AssignmentExtensionRequest.objects.count()}")
print(f"Total Notifications: {Notification.objects.count()}")

print("\n--- Notification Types in DB ---")
types = Notification.objects.values('notification_type').annotate(count=Count('id'))
for t in types:
    print(f"Type: {t['notification_type']}, Count: {t['count']}")

print("\n--- Latest 10 Notifications ---")
for notif in Notification.objects.order_by('-created_at')[:10]:
    print(f"Type: {notif.notification_type}, Title: {notif.title}, User: {notif.user.username}")
