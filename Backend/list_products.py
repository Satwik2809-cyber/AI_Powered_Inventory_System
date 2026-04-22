import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def list_products():
    url = f"{BASE_URL}/products"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            products = response.json()
            print(f"Products ({len(products)}):")
            for p in products:
                print(f"- {p['name']} (Category: {p['category']}, Rate: {p['rate']}, Qty: {p['quantity']})")
        else:
            print(f"Error fetching products: {response.status_code}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    list_products()
