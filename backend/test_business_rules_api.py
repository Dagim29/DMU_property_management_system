#!/usr/bin/env python
"""
Test script for Asset Business Rules API endpoints.
Tests BR-AM-01 through BR-AM-07 implementation.
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import requests
from datetime import datetime, timedelta
from django.contrib.auth import get_user_model
from apps.assets.models import Asset, Campus, Room, Building, Floor

User = get_user_model()

# API Configuration
BASE_URL = 'http://localhost:8000/api'
HEADERS = {'Content-Type': 'application/json'}

def print_section(title):
    """Print a formatted section header."""
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")

def print_result(test_name, success, message=""):
    """Print test result."""
    status = "✓ PASS" if success else "✗ FAIL"
    print(f"{status} - {test_name}")
    if message:
        print(f"    {message}")

def login(username, password):
    """Login and get auth token."""
    response = requests.post(
        f'{BASE_URL}/users/login/',
        json={'username': username, 'password': password},
        headers=HEADERS
    )
    if response.status_code == 200:
        data = response.json()
        token = data.get('access')
        return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    return None

def test_asset_transfer_dual_approval():
    """Test BR-AM-02: Dual-approval workflow for asset transfers."""
    print_section("BR-AM-02: Asset Transfer Dual-Approval")
    
    # Login as property manager
    auth_headers = login('admin', 'admin123')
    if not auth_headers:
        print_result("Login", False, "Failed to authenticate")
        return
    
    # Get an asset
    response = requests.get(f'{BASE_URL}/assets/assets/', headers=auth_headers)
    if response.status_code != 200 or not response.json().get('results'):
        print_result("Get Assets", False, "No assets found")
        return
    
    asset = response.json()['results'][0]
    asset_id = asset['asset_id']
    print(f"Testing with asset: {asset_id} - {asset['name']}")
    
    # Get rooms for transfer
    response = requests.get(f'{BASE_URL}/assets/rooms/', headers=auth_headers)
    if response.status_code != 200 or not response.json().get('results'):
        print_result("Get Rooms", False, "No rooms found")
        return
    
    rooms = response.json()['results']
    if len(rooms) < 2:
        print_result("Get Rooms", False, "Need at least 2 rooms for transfer test")
        return
    
    from_room = rooms[0]['id']
    to_room = rooms[1]['id']
    
    # Create transfer request
    transfer_data = {
        'asset': asset_id,
        'from_room': from_room,
        'to_room': to_room,
        'reason': 'Testing dual-approval workflow'
    }
    
    response = requests.post(
        f'{BASE_URL}/assets/transfers/',
        json=transfer_data,
        headers=auth_headers
    )
    
    if response.status_code == 201:
        transfer = response.json()
        transfer_id = transfer['id']
        print_result("Create Transfer", True, f"Transfer ID: {transfer_id}")
        print(f"    Status: {transfer['approval_status']}")
        
        # Test source approval
        response = requests.post(
            f'{BASE_URL}/assets/transfers/{transfer_id}/approve_source/',
            headers=auth_headers
        )
        
        if response.status_code == 200:
            result = response.json()
            print_result("Source Approval", True, f"Status: {result['approval_status']}")
        else:
            print_result("Source Approval", False, response.text)
        
        # Test destination approval
        response = requests.post(
            f'{BASE_URL}/assets/transfers/{transfer_id}/approve_dest/',
            headers=auth_headers
        )
        
        if response.status_code == 200:
            result = response.json()
            print_result("Destination Approval", True, f"Status: {result['approval_status']}")
        else:
            print_result("Destination Approval", False, response.text)
    else:
        print_result("Create Transfer", False, response.text)

def test_asset_disposal_workflow():
    """Test BR-AM-03: Asset disposal with committee review and manager approval."""
    print_section("BR-AM-03: Asset Disposal Workflow")
    
    # Login as property manager
    auth_headers = login('admin', 'admin123')
    if not auth_headers:
        print_result("Login", False, "Failed to authenticate")
        return
    
    # Get an asset
    response = requests.get(f'{BASE_URL}/assets/assets/', headers=auth_headers)
    if response.status_code != 200 or not response.json().get('results'):
        print_result("Get Assets", False, "No assets found")
        return
    
    asset = response.json()['results'][0]
    asset_id = asset['asset_id']
    print(f"Testing with asset: {asset_id} - {asset['name']}")
    
    # Create disposal request
    disposal_data = {
        'asset': asset_id,
        'disposal_method': 'SALE',
        'reason': 'Asset is obsolete and no longer needed',
        'estimated_value': 5000.00
    }
    
    response = requests.post(
        f'{BASE_URL}/assets/disposals/',
        json=disposal_data,
        headers=auth_headers
    )
    
    if response.status_code == 201:
        disposal = response.json()
        disposal_id = disposal['id']
        print_result("Create Disposal", True, f"Disposal ID: {disposal_id}")
        print(f"    Status: {disposal['status']}")
        
        # Test committee approval
        response = requests.post(
            f'{BASE_URL}/assets/disposals/{disposal_id}/committee_approve/',
            json={'notes': 'Committee reviewed and approved'},
            headers=auth_headers
        )
        
        if response.status_code == 200:
            result = response.json()
            print_result("Committee Approval", True, f"Status: {result['status']}")
        else:
            print_result("Committee Approval", False, response.text)
        
        # Test manager approval
        response = requests.post(
            f'{BASE_URL}/assets/disposals/{disposal_id}/manager_approve/',
            json={'notes': 'Property manager approved'},
            headers=auth_headers
        )
        
        if response.status_code == 200:
            result = response.json()
            print_result("Manager Approval", True, f"Status: {result['status']}")
            print(f"    Asset Status: {result['asset_status']}")
        else:
            print_result("Manager Approval", False, response.text)
    else:
        print_result("Create Disposal", False, response.text)

def test_asset_verification():
    """Test BR-AM-04: Annual verification with discrepancy reporting."""
    print_section("BR-AM-04: Asset Verification")
    
    # Login as property manager
    auth_headers = login('admin', 'admin123')
    if not auth_headers:
        print_result("Login", False, "Failed to authenticate")
        return
    
    # Get an asset
    response = requests.get(f'{BASE_URL}/assets/assets/', headers=auth_headers)
    if response.status_code != 200 or not response.json().get('results'):
        print_result("Get Assets", False, "No assets found")
        return
    
    asset = response.json()['results'][0]
    asset_id = asset['asset_id']
    print(f"Testing with asset: {asset_id} - {asset['name']}")
    
    # Create verification without discrepancy
    verification_data = {
        'asset': asset_id,
        'verification_date': datetime.now().date().isoformat(),
        'physical_condition': 'GOOD',
        'location_verified': True,
        'has_discrepancy': False,
        'notes': 'Annual verification completed'
    }
    
    response = requests.post(
        f'{BASE_URL}/assets/verifications/',
        json=verification_data,
        headers=auth_headers
    )
    
    if response.status_code == 201:
        verification = response.json()
        print_result("Create Verification", True, f"Verification ID: {verification['id']}")
        print(f"    Status: {verification['status']}")
        print(f"    Has Discrepancy: {verification['has_discrepancy']}")
    else:
        print_result("Create Verification", False, response.text)
    
    # Create verification with discrepancy
    verification_data['has_discrepancy'] = True
    verification_data['discrepancy_details'] = 'Asset location does not match records'
    
    response = requests.post(
        f'{BASE_URL}/assets/verifications/',
        json=verification_data,
        headers=auth_headers
    )
    
    if response.status_code == 201:
        verification = response.json()
        verification_id = verification['id']
        print_result("Create Verification with Discrepancy", True, f"Verification ID: {verification_id}")
        print(f"    Status: {verification['status']}")
        print(f"    Discrepancy: {verification['discrepancy_details']}")
    else:
        print_result("Create Verification with Discrepancy", False, response.text)

def test_business_rule_checks():
    """Test business rule checking endpoints."""
    print_section("Business Rule Checks")
    
    # Login as property manager
    auth_headers = login('admin', 'admin123')
    if not auth_headers:
        print_result("Login", False, "Failed to authenticate")
        return
    
    # Get an asset
    response = requests.get(f'{BASE_URL}/assets/assets/', headers=auth_headers)
    if response.status_code != 200 or not response.json().get('results'):
        print_result("Get Assets", False, "No assets found")
        return
    
    asset = response.json()['results'][0]
    asset_id = asset['asset_id']
    print(f"Testing with asset: {asset_id} - {asset['name']}")
    
    # Check all business rules
    response = requests.get(
        f'{BASE_URL}/assets/business-rules/check/{asset_id}/',
        headers=auth_headers
    )
    
    if response.status_code == 200:
        result = response.json()
        print_result("Check All Rules", True, f"Checked {result['rules_checked']} rules")
        
        for rule in result['rules']:
            print(f"\n    {rule['rule']}: {rule['name']}")
            print(f"    Status: {rule['status']}")
            print(f"    Message: {rule['message']}")
    else:
        print_result("Check All Rules", False, response.text)
    
    # Check permissions
    response = requests.get(
        f'{BASE_URL}/assets/business-rules/permissions/{asset_id}/',
        headers=auth_headers
    )
    
    if response.status_code == 200:
        result = response.json()
        print_result("Check Permissions", True, f"User role: {result['user_role']}")
        
        permissions = result['permissions']
        print(f"\n    Permissions:")
        print(f"    - Can View: {permissions['can_view']}")
        print(f"    - Can Edit: {permissions['can_edit']}")
        print(f"    - Can Transfer: {permissions['can_transfer']}")
        print(f"    - Can Dispose: {permissions['can_dispose']}")
        print(f"    - Can Verify: {permissions['can_verify']}")
    else:
        print_result("Check Permissions", False, response.text)

def test_transfer_restrictions():
    """Test BR-AM-05: Assets under maintenance cannot be transferred."""
    print_section("BR-AM-05: Transfer Restrictions")
    
    # Login as property manager
    auth_headers = login('admin', 'admin123')
    if not auth_headers:
        print_result("Login", False, "Failed to authenticate")
        return
    
    # Get an asset and set it to maintenance status
    response = requests.get(f'{BASE_URL}/assets/assets/', headers=auth_headers)
    if response.status_code != 200 or not response.json().get('results'):
        print_result("Get Assets", False, "No assets found")
        return
    
    asset = response.json()['results'][0]
    asset_id = asset['asset_id']
    print(f"Testing with asset: {asset_id} - {asset['name']}")
    
    # Update asset to maintenance status
    response = requests.patch(
        f'{BASE_URL}/assets/assets/{asset_id}/',
        json={'status': 'MAINTENANCE'},
        headers=auth_headers
    )
    
    if response.status_code == 200:
        print_result("Set Asset to Maintenance", True)
        
        # Try to create transfer (should fail)
        response = requests.get(f'{BASE_URL}/assets/rooms/', headers=auth_headers)
        if response.status_code == 200 and response.json().get('results'):
            rooms = response.json()['results']
            if len(rooms) >= 2:
                transfer_data = {
                    'asset': asset_id,
                    'from_room': rooms[0]['id'],
                    'to_room': rooms[1]['id'],
                    'reason': 'Testing transfer restriction'
                }
                
                response = requests.post(
                    f'{BASE_URL}/assets/transfers/',
                    json=transfer_data,
                    headers=auth_headers
                )
                
                if response.status_code == 400:
                    print_result("Transfer Blocked", True, "Transfer correctly blocked for asset under maintenance")
                else:
                    print_result("Transfer Blocked", False, "Transfer should have been blocked")
    else:
        print_result("Set Asset to Maintenance", False, response.text)

def main():
    """Run all tests."""
    print("\n" + "="*80)
    print("  ASSET BUSINESS RULES API TEST SUITE")
    print("  Testing BR-AM-01 through BR-AM-07")
    print("="*80)
    
    try:
        test_asset_transfer_dual_approval()
        test_asset_disposal_workflow()
        test_asset_verification()
        test_business_rule_checks()
        test_transfer_restrictions()
        
        print("\n" + "="*80)
        print("  TEST SUITE COMPLETED")
        print("="*80 + "\n")
        
    except Exception as e:
        print(f"\n✗ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
