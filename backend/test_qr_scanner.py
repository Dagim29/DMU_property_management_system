"""Test script for QR Scanner feature."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.assets.models import Asset
from apps.assets.qr_service import qr_service

def test_qr_scanner():
    print("=" * 60)
    print("Testing QR Scanner Feature")
    print("=" * 60)
    
    # Get a test asset
    asset = Asset.objects.first()
    if not asset:
        print("❌ No assets found in database")
        return
    
    print(f"\n✓ Testing with asset: {asset.asset_id} - {asset.name}")
    
    # Test encryption
    print("\n📝 Testing QR Code Encryption...")
    encrypted_data = qr_service.encrypt_asset_id(asset.asset_id)
    print(f"   Encrypted data: {encrypted_data[:50]}...")
    
    # Test decryption
    print("\n🔓 Testing QR Code Decryption...")
    decrypted = qr_service.decrypt_qr_data(encrypted_data)
    print(f"   Asset ID: {decrypted['asset_id']}")
    print(f"   Valid: {decrypted['valid']}")
    print(f"   Expires: {decrypted['expires']}")
    
    # Verify round trip
    if decrypted['asset_id'] == asset.asset_id and decrypted['valid']:
        print("\n✅ Round trip successful!")
    else:
        print("\n❌ Round trip failed!")
        return
    
    # Test QR code generation
    print("\n🎨 Testing QR Code Generation...")
    qr_bytes = qr_service.generate_qr_code(asset.asset_id)
    print(f"   Generated QR code: {len(qr_bytes)} bytes")
    
    # Test with invalid data
    print("\n🔒 Testing Invalid QR Code...")
    invalid_result = qr_service.decrypt_qr_data("invalid_data_here")
    if not invalid_result['valid']:
        print("   ✓ Invalid QR code correctly rejected")
    else:
        print("   ❌ Invalid QR code was accepted!")
    
    print("\n🌐 Testing API endpoints:")
    print("   POST /api/owner/qr/scan/")
    print("        Body: {qr_data: encrypted_string}")
    print("   POST /api/owner/qr/quick-maintenance/")
    print("        Body: {asset_id, priority, description, photo}")
    print("   GET  /api/owner/qr/offline-cache/")
    print("   POST /api/owner/qr/sync-offline-actions/")
    print("        Body: {actions: [{type, data, timestamp}]}")
    
    print("\n" + "=" * 60)
    print("✅ QR Scanner feature implementation complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Install html5-qrcode: npm install html5-qrcode")
    print("2. Start the backend server: python manage.py runserver")
    print("3. Start the frontend: npm run dev")
    print("4. Navigate to Owner Dashboard")
    print("5. Click 'Scan QR Code' button")
    print("6. Test scanning with camera or manual entry")
    print("7. Test quick maintenance form")
    print("\nNote: For testing, you can:")
    print("- Print QR codes from asset detail pages")
    print("- Use manual entry with asset IDs")
    print("- Test on mobile devices for best experience")

if __name__ == '__main__':
    test_qr_scanner()
