import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.urls import reverse, resolve
from django.test import RequestFactory
from apps.assets.views import AssetViewSet

# Test URL resolution
try:
    url = reverse('asset-export')
    print(f"✓ URL reverse works: {url}")
except Exception as e:
    print(f"✗ URL reverse failed: {e}")

# Test direct URL
try:
    match = resolve('/api/assets/assets/export/')
    print(f"✓ URL resolves: {match}")
except Exception as e:
    print(f"✗ URL resolve failed: {e}")

# Check if export method exists
if hasattr(AssetViewSet, 'export'):
    print("✓ AssetViewSet.export method exists")
else:
    print("✗ AssetViewSet.export method NOT found")

# List all asset-related URLs
from django.urls import get_resolver
resolver = get_resolver()
print("\nAll registered URLs containing 'asset':")
for pattern in resolver.url_patterns:
    if 'assets' in str(pattern.pattern):
        print(f"  - {pattern.pattern}")
        if hasattr(pattern, 'url_patterns'):
            for sub in pattern.url_patterns:
                print(f"    - {sub.pattern}")
