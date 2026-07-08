from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse

def test_view(request):
    return HttpResponse("Test endpoint works!")

# Try to import export_assets and handle any errors
try:
    from apps.assets.export_views import export_assets
    def export_view(request):
        print(f"EXPORT VIEW CALLED! Format: {request.GET.get('format')}")
        return export_assets(request)
    print("Successfully imported export_assets")
except Exception as e:
    print(f"Failed to import export_assets: {e}")
    def export_view(request):
        return HttpResponse(f"Import error: {e}", status=500)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/test/', test_view, name='test'),
    path('api/assets-export/', export_view, name='asset-export-direct'),
    path('api/users/', include('apps.users.urls')),
    path('api/owner/', include('apps.users.owner_urls')),
    path('api/technician/', include('apps.users.technician_urls')),
    path('api/assets/', include('apps.assets.urls')),
    path('api/maintenance/', include('apps.maintenance.urls')),
    path('api/reports/', include('apps.reports.urls')),
    path('api/core/', include('apps.core.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
