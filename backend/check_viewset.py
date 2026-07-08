import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.assets.views import AssetViewSet
from rest_framework.routers import DefaultRouter

# Check if export method exists
print("=" * 60)
print("CHECKING AssetViewSet")
print("=" * 60)

if hasattr(AssetViewSet, 'export'):
    print("✓ export method EXISTS")
    export_method = getattr(AssetViewSet, 'export')
    print(f"  Method: {export_method}")
    
    # Check if it has the action decorator
    if hasattr(export_method, 'mapping'):
        print(f"  ✓ Has action mapping: {export_method.mapping}")
    else:
        print("  ✗ NO action mapping found")
        
    if hasattr(export_method, 'detail'):
        print(f"  Detail: {export_method.detail}")
    
    if hasattr(export_method, 'url_path'):
        print(f"  URL path: {export_method.url_path}")
else:
    print("✗ export method DOES NOT EXIST")
    print("\nAvailable methods:")
    for attr in dir(AssetViewSet):
        if not attr.startswith('_') and callable(getattr(AssetViewSet, attr)):
            print(f"  - {attr}")

print("\n" + "=" * 60)
print("CHECKING ROUTER REGISTRATION")
print("=" * 60)

router = DefaultRouter()
router.register(r'assets', AssetViewSet, basename='asset')

print("\nGenerated URLs:")
for pattern in router.urls:
    print(f"  {pattern.pattern} -> {pattern.name}")
