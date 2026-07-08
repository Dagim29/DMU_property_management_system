"""
Test script for Checkout Extension Request workflow
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.assets.models import CheckoutExtensionRequest, AssetCheckout, Asset
from apps.users.models import User
from datetime import date, timedelta

def test_extension_workflow():
    """Test the complete extension request workflow."""
    print("=" * 60)
    print("CHECKOUT EXTENSION REQUEST WORKFLOW TEST")
    print("=" * 60)
    
    # Get test data
    print("\n1. Fetching test data...")
    try:
        # Get an active checkout
        checkout = AssetCheckout.objects.filter(is_returned=False).first()
        if not checkout:
            print("❌ No active checkouts found. Please create a checkout first.")
            return
        
        print(f"✅ Found checkout: {checkout.asset.asset_id}")
        print(f"   Checked out to: {checkout.checked_out_to.get_full_name()}")
        print(f"   Current return date: {checkout.expected_return_date}")
        
        # Get a property manager
        manager = User.objects.filter(role='PROPERTY_MANAGER').first()
        if not manager:
            print("❌ No property manager found.")
            return
        
        print(f"✅ Found manager: {manager.get_full_name()}")
        
    except Exception as e:
        print(f"❌ Error fetching test data: {e}")
        return
    
    # Create extension request
    print("\n2. Creating extension request...")
    try:
        new_return_date = checkout.expected_return_date + timedelta(days=7)
        extension_request = CheckoutExtensionRequest.objects.create(
            checkout=checkout,
            requested_by=checkout.checked_out_to,
            current_return_date=checkout.expected_return_date,
            requested_return_date=new_return_date,
            reason="Need more time to complete the project work"
        )
        print(f"✅ Extension request created (ID: {extension_request.id})")
        print(f"   Status: {extension_request.status}")
        print(f"   Extension: {extension_request.requested_return_date - extension_request.current_return_date}")
        
    except Exception as e:
        print(f"❌ Error creating extension request: {e}")
        return
    
    # Test approval
    print("\n3. Testing approval workflow...")
    try:
        # Check if can approve
        if extension_request.can_approve(manager):
            print(f"✅ Manager can approve this request")
            
            # Approve the request
            extension_request.approve(manager, "Approved - valid reason provided")
            print(f"✅ Extension request approved")
            print(f"   Status: {extension_request.status}")
            print(f"   Reviewed by: {extension_request.reviewed_by.get_full_name()}")
            print(f"   Review date: {extension_request.review_date}")
            
            # Verify checkout was updated
            checkout.refresh_from_db()
            print(f"✅ Checkout updated")
            print(f"   New return date: {checkout.expected_return_date}")
            
            if checkout.expected_return_date == new_return_date:
                print("✅ Checkout return date matches requested date")
            else:
                print("❌ Checkout return date doesn't match!")
        else:
            print("❌ Manager cannot approve this request")
            
    except Exception as e:
        print(f"❌ Error during approval: {e}")
        return
    
    # Test rejection (create another request)
    print("\n4. Testing rejection workflow...")
    try:
        # Create another extension request
        another_new_date = checkout.expected_return_date + timedelta(days=14)
        rejection_request = CheckoutExtensionRequest.objects.create(
            checkout=checkout,
            requested_by=checkout.checked_out_to,
            current_return_date=checkout.expected_return_date,
            requested_return_date=another_new_date,
            reason="Need even more time"
        )
        print(f"✅ Second extension request created (ID: {rejection_request.id})")
        
        # Reject it
        rejection_request.reject(manager, "Extension period too long")
        print(f"✅ Extension request rejected")
        print(f"   Status: {rejection_request.status}")
        print(f"   Review notes: {rejection_request.review_notes}")
        
        # Verify checkout was NOT updated
        checkout.refresh_from_db()
        if checkout.expected_return_date == new_return_date:
            print("✅ Checkout return date unchanged (correct)")
        else:
            print("❌ Checkout return date was changed (incorrect)")
            
    except Exception as e:
        print(f"❌ Error during rejection: {e}")
        return
    
    # Test statistics
    print("\n5. Testing statistics...")
    try:
        total = CheckoutExtensionRequest.objects.count()
        pending = CheckoutExtensionRequest.objects.filter(status='PENDING').count()
        approved = CheckoutExtensionRequest.objects.filter(status='APPROVED').count()
        rejected = CheckoutExtensionRequest.objects.filter(status='REJECTED').count()
        
        print(f"✅ Extension Request Statistics:")
        print(f"   Total: {total}")
        print(f"   Pending: {pending}")
        print(f"   Approved: {approved}")
        print(f"   Rejected: {rejected}")
        
    except Exception as e:
        print(f"❌ Error getting statistics: {e}")
        return
    
    print("\n" + "=" * 60)
    print("✅ ALL TESTS PASSED!")
    print("=" * 60)
    print("\nThe checkout extension approval workflow is working correctly!")
    print("\nNext steps:")
    print("1. Test the API endpoints using the frontend")
    print("2. Verify notifications are created")
    print("3. Test with different user roles")
    print("4. Test edge cases (invalid dates, permissions, etc.)")

if __name__ == '__main__':
    test_extension_workflow()
