"""
Test security views imports
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.security_views import IPAccessControlViewSet, FailedLoginAttemptViewSet
from django.db.models import Sum, Count

print("✓ All imports successful!")
print("✓ IPAccessControlViewSet imported")
print("✓ FailedLoginAttemptViewSet imported")
print("✓ Sum and Count from django.db.models imported")
