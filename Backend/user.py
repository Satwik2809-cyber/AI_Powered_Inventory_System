import hashlib

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from database import engine
from models import Product, Sale, MonthlyCount
from auth_and_users import get_current_user
from datetime import date

router = APIRouter(prefix="/user", tags=["User"])

@router.get("/dashboard")
def user_dashboard(current_user = Depends(get_current_user)):
    with Session(engine) as session:

        today = date.today()

        # DAILY SALES
        daily_sales = session.exec(
            select(Sale).where(Sale.sale_date == today)
        ).all()

        daily_revenue = sum(s.total_amount for s in daily_sales)

        # STOCK ALERTS
        products = session.exec(select(Product)).all()
        low_stock = sum(1 for p in products if p.quantity <= 5)
        critical_stock = sum(1 for p in products if p.quantity <= 2)

        # MONTHLY
        month = today.strftime("%Y-%m")
        monthly = session.exec(
            select(MonthlyCount)
            .where(MonthlyCount.status == "open")
            .order_by(MonthlyCount.created_at.desc())
        ).first()

        return {
            "daily_sales": len(daily_sales),
            "daily_revenue": daily_revenue,
            "today_revenue": daily_revenue,
            "low_stock": low_stock,
            "critical_stock": critical_stock,
            "active_event": None,
            "monthly": monthly
        }