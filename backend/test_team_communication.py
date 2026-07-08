"""
Test script for Team Communication API
Run with: python test_team_communication.py
"""
import requests
import json

BASE_URL = "http://localhost:8000"

# You'll need to get a valid token first
# Login as supervisor
login_response = requests.post(f"{BASE_URL}/api/users/login/", json={
    "username": "supervisor",  # Replace with actual supervisor username
    "password": "supervisor123"  # Replace with actual password
})

if login_response.status_code == 200:
    token = login_response.json()['access']
    headers = {"Authorization": f"Bearer {token}"}
    
    print("✓ Login successful")
    print(f"Token: {token[:20]}...")
    
    # Test 1: Get team members
    print("\n--- Test 1: Get Team Members ---")
    response = requests.get(
        f"{BASE_URL}/api/maintenance/communication/messages/team_members/",
        headers=headers
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        members = response.json()
        print(f"✓ Found {len(members)} team members")
        if members:
            print(f"  First member: {members[0].get('full_name')} ({members[0].get('role')})")
    else:
        print(f"✗ Error: {response.text}")
    
    # Test 2: Get conversations
    print("\n--- Test 2: Get Conversations ---")
    response = requests.get(
        f"{BASE_URL}/api/maintenance/communication/messages/conversations/",
        headers=headers
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        conversations = response.json()
        print(f"✓ Found {len(conversations)} conversations")
    else:
        print(f"✗ Error: {response.text}")
    
    # Test 3: Get unread count
    print("\n--- Test 3: Get Unread Count ---")
    response = requests.get(
        f"{BASE_URL}/api/maintenance/communication/messages/unread_count/",
        headers=headers
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Unread messages: {data.get('unread_count')}")
    else:
        print(f"✗ Error: {response.text}")
    
    # Test 4: Send a test message (if there are team members)
    if response.status_code == 200 and members:
        print("\n--- Test 4: Send Test Message ---")
        test_message = {
            "recipient": members[0]['id'],
            "message_type": "DIRECT",
            "priority": "NORMAL",
            "subject": "Test Message",
            "message": "This is a test message from the communication system."
        }
        response = requests.post(
            f"{BASE_URL}/api/maintenance/communication/messages/",
            headers=headers,
            json=test_message
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 201:
            print(f"✓ Message sent successfully")
            print(f"  Response: {json.dumps(response.json(), indent=2)}")
        else:
            print(f"✗ Error: {response.text}")
    
    # Test 5: Get announcements
    print("\n--- Test 5: Get Announcements ---")
    response = requests.get(
        f"{BASE_URL}/api/maintenance/communication/announcements/",
        headers=headers
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        announcements = response.json()
        print(f"✓ Found {len(announcements)} announcements")
    else:
        print(f"✗ Error: {response.text}")
    
    # Test 6: Create test announcement
    print("\n--- Test 6: Create Test Announcement ---")
    test_announcement = {
        "title": "Test Announcement",
        "content": "This is a test announcement for the team communication system.",
        "category": "GENERAL",
        "priority": "NORMAL",
        "target_all_technicians": True,
        "is_pinned": False
    }
    response = requests.post(
        f"{BASE_URL}/api/maintenance/communication/announcements/",
        headers=headers,
        json=test_announcement
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 201:
        print(f"✓ Announcement created successfully")
        print(f"  Response: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"✗ Error: {response.text}")
    
    print("\n" + "="*50)
    print("✓ All tests completed!")
    print("="*50)
    
else:
    print(f"✗ Login failed: {login_response.status_code}")
    print(f"Response: {login_response.text}")
    print("\nPlease update the username and password in the script.")
