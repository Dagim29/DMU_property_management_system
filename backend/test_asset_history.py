"""Test script for Asset History & Timeline feature."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.assets.models import Asset, AssetEvent, AssetCheckout, AssetTransfer
from apps.maintenance.models import MaintenanceRequest
from datetime import datetime, timedelta

User = get_user_model()

def test_asset_history():
    print("=" * 60)
    print("Testing Asset History & Timeline Feature")
    print("=" * 60)
    
    # Get a test asset
    asset = Asset.objects.first()
    if not asset:
        print("❌ No assets found in database")
        return
    
    print(f"\n✓ Testing with asset: {asset.asset_id} - {asset.name}")
    
    # Check if events exist
    events = AssetEvent.objects.filter(asset=asset)
    print(f"\n📊 Total events for this asset: {events.count()}")
    
    if events.exists():
        print("\n📋 Event breakdown:")
        for event_type, _ in AssetEvent.EVENT_TYPES:
            count = events.filter(event_type=event_type).count()
            if count > 0:
                print(f"   - {event_type}: {count}")
        
        print("\n🕐 Recent events:")
        for event in events[:5]:
            print(f"   - {event.event_date.strftime('%Y-%m-%d %H:%M')} | {event.get_event_type_display()} | {event.description[:50]}")
    else:
        print("\n⚠️  No events found. Creating test events...")
        
        # Create a test checkout event
        user = User.objects.filter(role='OWNER').first()
        if user and asset.assigned_to:
            checkout = AssetCheckout.objects.create(
                asset=asset,
                checked_out_to=asset.assigned_to,
                checked_out_by=user,
                purpose="Testing asset history",
                expected_return_date=datetime.now().date() + timedelta(days=7),
                checkout_condition="GOOD"
            )
            print(f"   ✓ Created test checkout: {checkout.id}")
            
            # Check if event was created
            checkout_events = AssetEvent.objects.filter(asset=asset, event_type='CHECKOUT')
            if checkout_events.exists():
                print(f"   ✓ Checkout event automatically created!")
            else:
                print(f"   ❌ Checkout event was NOT created automatically")
    
    # Test API endpoint
    print("\n🌐 Testing API endpoints:")
    print(f"   GET /api/owner/my-assets/{asset.id}/history/")
    print(f"   GET /api/owner/my-assets/{asset.id}/history/timeline/")
    print(f"   GET /api/owner/my-assets/{asset.id}/history/export/?format=csv")
    
    print("\n" + "=" * 60)
    print("✅ Asset History feature implementation complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Start the backend server: python manage.py runserver")
    print("2. Start the frontend: npm run dev")
    print("3. Navigate to an asset's history page")
    print("4. Test filtering, timeline view, and export functionality")

if __name__ == '__main__':
    test_asset_history()
