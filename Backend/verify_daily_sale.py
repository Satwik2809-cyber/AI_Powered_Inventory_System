
import requests
import json
import time

# Configuration
BASE_URL = "http://127.0.0.1:8000"
HEADERS = {'Content-Type': 'application/json'}

def login(username, password):
    url = f"{BASE_URL}/auth/login"
    # The backend expects a JSON body with LoginRequest model
    payload = {
        "username": username,
        "password": password
    }
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            print("✅ Login Successful")
            return response.json()["access_token"]
        else:
            print(f"❌ Login Failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login Error: {e}")
        return None

def test_daily_sale(token):
    url = f"{BASE_URL}/sales/daily"
    headers = HEADERS.copy()
    headers['Authorization'] = f"Bearer {token}"
    
    # Payload simulating a daily sale request
    payload = {
        "user_id": 1, 
        "payment_mode": "cash",
        "items": [
            {
                "product_id": 1, # Assuming product ID 1 exists
                "name": "Test Product",
                "category": "Test Category",
                "rate": 100.0,
                "quantity": 1
            }
        ]
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code == 200:
            print("✅ Daily Sale Successful")
            print(f"Response: {response.json()}")
        else:
            print(f"❌ Daily Sale Failed: {response.text}")
            
    except Exception as e:
         print(f"❌ Daily Sale Error: {e}")

if __name__ == "__main__":
    # You might need to adjust credentials if they are different
    token = login("Richa_Bharati", "123") # Replace with valid credentials if known, or use create_admin.py to make one
    if token:
        test_daily_sale(token)
