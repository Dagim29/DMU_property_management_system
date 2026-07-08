"""Test script for Feedback & Rating System API."""
import requests
import json

BASE_URL = "http://localhost:8000"

# Login credentials (using owner user)
LOGIN_DATA = {
    "username": "staff.john",
    "password": "password123"
}

def test_feedback_system():
    """Test the feedback and rating system endpoints."""
    
    # Login
    print("1. Logging in...")
    response = requests.post(f"{BASE_URL}/api/users/auth/login/", json=LOGIN_DATA)
    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code}")
        print(response.text)
        return
    
    token = response.json()['access']
    headers = {"Authorization": f"Bearer {token}"}
    print("✓ Login successful")
    
    # Get user's maintenance requests
    print("\n2. Fetching maintenance requests...")
    response = requests.get(f"{BASE_URL}/api/owner/my-requests/", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to fetch requests: {response.status_code}")
        return
    
    requests_data = response.json()
    
    # Handle both list and paginated response
    if isinstance(requests_data, dict) and 'results' in requests_data:
        requests_list = requests_data['results']
    elif isinstance(requests_data, list):
        requests_list = requests_data
    else:
        requests_list = []
    
    print(f"✓ Found {len(requests_list)} maintenance requests")
    
    # Find a completed request
    completed_request = None
    for req in requests_list:
        if req['status'] == 'COMPLETED':
            completed_request = req
            break
    
    if not completed_request:
        print("⚠ No completed maintenance requests found to rate")
        print("   Skipping service rating test")
    else:
        # Test service rating
        print(f"\n3. Testing service rating for request {completed_request['request_id']}...")
        rating_data = {
            "maintenance_request": completed_request['id'],
            "overall_rating": 5,
            "timeliness_rating": 4,
            "quality_rating": 5,
            "communication_rating": 4,
            "feedback_text": "Great service! Very professional and timely.",
            "is_anonymous": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/owner/feedback/service-rating/",
            json=rating_data,
            headers=headers
        )
        
        if response.status_code == 201:
            print("✓ Service rating submitted successfully")
            print(f"  Rating ID: {response.json()['id']}")
        elif response.status_code == 400 and 'already been rated' in response.text:
            print("⚠ Request already rated (expected if running test multiple times)")
        else:
            print(f"❌ Failed to submit rating: {response.status_code}")
            print(response.text)
    
    # Get user's assets
    print("\n4. Fetching user's assets...")
    response = requests.get(f"{BASE_URL}/api/owner/my-assets/", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to fetch assets: {response.status_code}")
        return
    
    assets = response.json()
    
    # Handle both list and paginated response
    if isinstance(assets, dict) and 'results' in assets:
        assets_list = assets['results']
    elif isinstance(assets, list):
        assets_list = assets
    else:
        assets_list = []
    
    print(f"✓ Found {len(assets_list)} assigned assets")
    
    if len(assets_list) == 0:
        print("⚠ No assets assigned to user")
        print("   Skipping asset feedback test")
    else:
        # Test asset feedback
        print(f"\n5. Testing asset feedback for {assets_list[0]['asset_id']}...")
        feedback_data = {
            "asset": assets_list[0]['id'],
            "feedback_type": "CONDITION",
            "description": "The keyboard is showing signs of wear. Some keys are sticking.",
            "photos": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/owner/feedback/asset-feedback/",
            json=feedback_data,
            headers=headers
        )
        
        if response.status_code == 201:
            print("✓ Asset feedback submitted successfully")
            print(f"  Feedback ID: {response.json()['id']}")
        else:
            print(f"❌ Failed to submit feedback: {response.status_code}")
            print(response.text)
    
    # Test portal suggestion
    print("\n6. Testing portal suggestion...")
    suggestion_data = {
        "category": "FEATURES",
        "title": "Add dark mode to the portal",
        "description": "It would be great to have a dark mode option for the portal, especially for users working late hours.",
        "priority": "MEDIUM",
        "screenshots": []
    }
    
    response = requests.post(
        f"{BASE_URL}/api/owner/feedback/portal-suggestion/",
        json=suggestion_data,
        headers=headers
    )
    
    if response.status_code == 201:
        suggestion_id = response.json()['id']
        print("✓ Portal suggestion submitted successfully")
        print(f"  Suggestion ID: {suggestion_id}")
        
        # Test voting
        print("\n7. Testing suggestion voting...")
        response = requests.post(
            f"{BASE_URL}/api/owner/feedback/{suggestion_id}/vote/",
            headers=headers
        )
        
        if response.status_code == 200:
            print("✓ Vote added successfully")
            print(f"  Total votes: {response.json()['votes']}")
        else:
            print(f"❌ Failed to vote: {response.status_code}")
            print(response.text)
    else:
        print(f"❌ Failed to submit suggestion: {response.status_code}")
        print(response.text)
    
    # Test fetching all feedback
    print("\n8. Testing feedback retrieval...")
    
    # Get service ratings
    response = requests.get(f"{BASE_URL}/api/owner/feedback/service-ratings/", headers=headers)
    if response.status_code == 200:
        ratings = response.json()
        print(f"✓ Retrieved {len(ratings)} service ratings")
    else:
        print(f"❌ Failed to get ratings: {response.status_code}")
    
    # Get asset feedback
    response = requests.get(f"{BASE_URL}/api/owner/feedback/asset-feedback-list/", headers=headers)
    if response.status_code == 200:
        feedback = response.json()
        print(f"✓ Retrieved {len(feedback)} asset feedback items")
    else:
        print(f"❌ Failed to get feedback: {response.status_code}")
    
    # Get portal suggestions
    response = requests.get(f"{BASE_URL}/api/owner/feedback/portal-suggestions/", headers=headers)
    if response.status_code == 200:
        suggestions = response.json()
        print(f"✓ Retrieved {len(suggestions)} portal suggestions")
    else:
        print(f"❌ Failed to get suggestions: {response.status_code}")
    
    print("\n" + "="*50)
    print("✓ Feedback & Rating System tests completed!")
    print("="*50)

if __name__ == "__main__":
    print("Testing Feedback & Rating System API")
    print("="*50)
    test_feedback_system()
