"""
Test script for enhanced disposal fields
Run with: python test_disposal_enhanced.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.assets.models import Asset, AssetDisposal
from apps.users.models import User
from datetime import date, timedelta

def test_disposal_enhanced_fields():
    """Test that new disposal fields work correctly."""
    
    print("=" * 60)
    print("Testing Enhanced Disposal Fields")
    print("=" * 60)
    
    # Get or create test user
    user = User.objects.filter(role='PROPERTY_MANAGER').first()
    if not user:
        print("❌ No property manager found. Please create one first.")
        return
    
    print(f"✓ Using user: {user.get_full_name()} ({user.email})")
    
    # Get a test asset
    asset = Asset.objects.filter(status='AVAILABLE').first()
    if not asset:
        print("❌ No available assets found. Please create one first.")
        return
    
    print(f"✓ Using asset: {asset.asset_id} - {asset.name}")
    
    # Create disposal with all new fields
    print("\n" + "-" * 60)
    print("Creating disposal request with enhanced fields...")
    print("-" * 60)
    
    disposal = AssetDisposal.objects.create(
        asset=asset,
        requested_by=user,
        disposal_method='SALE',
        disposal_category='OBSOLETE',
        reason='Equipment is outdated and no longer meets current requirements',
        estimated_value=5000.00,
        planned_disposal_date=date.today() + timedelta(days=30),
        environmental_impact='No hazardous materials. Standard e-waste disposal procedures apply.',
        documentation='See attached disposal authorization form #2026-045'
    )
    
    print(f"✓ Disposal created: ID {disposal.id}")
    print(f"  - Status: {disposal.get_status_display()}")
    print(f"  - Method: {disposal.get_disposal_method_display()}")
    print(f"  - Category: {disposal.get_disposal_category_display()}")
    print(f"  - Planned Date: {disposal.planned_disposal_date}")
    print(f"  - Estimated Value: ${disposal.estimated_value}")
    
    # Verify fields are saved
    print("\n" + "-" * 60)
    print("Verifying fields are saved correctly...")
    print("-" * 60)
    
    saved_disposal = AssetDisposal.objects.get(id=disposal.id)
    
    checks = [
        ('disposal_category', saved_disposal.disposal_category, 'OBSOLETE'),
        ('planned_disposal_date', saved_disposal.planned_disposal_date, disposal.planned_disposal_date),
        ('environmental_impact', saved_disposal.environmental_impact, disposal.environmental_impact),
        ('documentation', saved_disposal.documentation, disposal.documentation),
    ]
    
    all_passed = True
    for field_name, actual, expected in checks:
        if actual == expected:
            print(f"✓ {field_name}: {actual}")
        else:
            print(f"❌ {field_name}: Expected {expected}, got {actual}")
            all_passed = False
    
    # Test serializer
    print("\n" + "-" * 60)
    print("Testing serializer...")
    print("-" * 60)
    
    from apps.assets.serializers import AssetDisposalSerializer
    serializer = AssetDisposalSerializer(saved_disposal)
    data = serializer.data
    
    serializer_checks = [
        'disposal_category',
        'disposal_category_display',
        'planned_disposal_date',
        'environmental_impact',
        'documentation',
        'disposal_method_display',
    ]
    
    for field in serializer_checks:
        if field in data:
            print(f"✓ {field}: {data[field]}")
        else:
            print(f"❌ {field}: Missing from serializer")
            all_passed = False
    
    # Cleanup
    print("\n" + "-" * 60)
    print("Cleaning up test data...")
    print("-" * 60)
    disposal.delete()
    print("✓ Test disposal deleted")
    
    # Summary
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ ALL TESTS PASSED")
    else:
        print("❌ SOME TESTS FAILED")
    print("=" * 60)

if __name__ == '__main__':
    test_disposal_enhanced_fields()
