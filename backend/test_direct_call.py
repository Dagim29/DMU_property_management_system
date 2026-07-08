import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from apps.assets.views import AssetViewSet

User = get_user_model()

# Create a test request
factory = RequestFactory()
request = factory.get('/api/assets/assets/export/', {'format': 'csv'})

# Create a test user
try:
    user = User.objects.first()
    if not user:
        print("No users found in database")
        exit(1)
    request.user = user
    
    # Create viewset instance
    viewset = AssetViewSet()
    viewset.request = request
    viewset.format_kwarg = None
    
    # Call export directly
    response = viewset.export(request)
    print(f"✓ Direct call successful!")
    print(f"  Status: {response.status_code}")
    print(f"  Content-Type: {response.get('Content-Type', 'N/A')}")
    
except Exception as e:
    print(f"✗ Direct call failed: {e}")
    import traceback
    traceback.print_exc()
