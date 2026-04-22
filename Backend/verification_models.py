import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import ProductCreateRequest, ProductRestockRequest, DailySaleRequest, DailySaleItemRequest
from datetime import date

print("--- Testing Pydantic Models ---")
# Test Pydantic models
try:
    p = ProductCreateRequest(name="Test", category="TestCat", rate=10.0)
    print("ProductCreateRequest: OK")
except Exception as e:
    print(f"ProductCreateRequest: FAILED {e}")

try:
    p = ProductRestockRequest(
        name="Test",
        category="TestCat",
        rate=10.0,
        quantity=10,
        manufacturing_date=date.today(),
        expiry_date=date.today()
    )
    print("ProductRestockRequest: OK")
except Exception as e:
    print(f"ProductRestockRequest: FAILED {e}")

try:
    item = DailySaleItemRequest(name="Test", category="TestCat", rate=10.0, quantity=1)
    sale = DailySaleRequest(user_id=1, payment_mode="cash", items=[item])
    print("DailySaleRequest: OK")
except Exception as e:
    print(f"DailySaleRequest: FAILED {e}")
