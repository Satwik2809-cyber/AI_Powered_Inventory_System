from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_db
import traceback
from datetime import date, datetime
from auth_and_users import get_current_user
from models import Product, Sale, Event, ProductBatch, EventSale

router = APIRouter(prefix="/user", tags=["Dashboard"])

@router.get("/dashboard")
def user_dashboard(
    session: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    print("ENTERED /user/dashboard")
    print("current_user:", current_user)

    try:
        # ---------------- SALES ----------------
        # Get start of today (local time assumption or UTC based on server)
        # Better to grab everything from 00:00:00 today
        # 1. Daily Sales
        # Fetch all and filter if needed, or refine query
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        daily_sales_list = session.exec(
            select(Sale).where(Sale.created_at >= today_start)
        ).all()
        
        daily_revenue = sum(s.total_amount for s in daily_sales_list)
        daily_sales_count = len(daily_sales_list)

        # 2. Event Sales (Active Event)
        event_revenue = 0
        event_sales_list = session.exec(
            select(EventSale).where(EventSale.created_at >= today_start)
        ).all()
        event_revenue = sum(es.total_amount for es in event_sales_list)

        # Total Revenue
        total_today_revenue = daily_revenue + event_revenue

        # ---------------- SALES HISTORY ----------------
        from datetime import timedelta
        
        # YESTERDAY
        yesterday_start = today_start - timedelta(days=1)
        yesterday_end = today_start
        
        yesterday_sales = session.exec(
            select(Sale).where(
                Sale.created_at >= yesterday_start,
                Sale.created_at < yesterday_end
            )
        ).all()
        yesterday_events = session.exec(
            select(EventSale).where(
                EventSale.created_at >= yesterday_start,
                EventSale.created_at < yesterday_end
            )
        ).all()
        
        yesterday_revenue = sum(s.total_amount for s in yesterday_sales) + sum(e.total_amount for e in yesterday_events)

        # MONTHLY — reset from last confirmed monthly count, not calendar month
        from models import MonthlyCount
        last_count = session.exec(
            select(MonthlyCount)
            .where(MonthlyCount.status == "confirmed")
            .order_by(MonthlyCount.end_date.desc())
        ).first()
        
        if last_count and last_count.end_date:
            month_period_start = last_count.end_date
        else:
            # No finalized count: fall back to calendar month start
            month_period_start = today_start.replace(day=1)
        
        month_sales = session.exec(
            select(Sale).where(Sale.created_at >= month_period_start)
        ).all()
        month_events = session.exec(
            select(EventSale).where(EventSale.created_at >= month_period_start)
        ).all()
        
        month_revenue = sum(s.total_amount for s in month_sales) + sum(e.total_amount for e in month_events)

        # ---------------- STOCK ----------------
        batches = session.exec(select(ProductBatch)).all()

        critical_stock = sum(1 for b in batches if b.quantity <= 2)
        low_stock = sum(1 for b in batches if b.quantity <= 5)

        # ---------------- ACTIVE EVENT ----------------
        active_event = session.exec(
            select(Event).where(Event.status == "active")
        ).first()

        response = {
            "daily_revenue": daily_revenue,
            "daily_sales": daily_sales_count,
            "today_revenue": total_today_revenue,
            "yesterday_revenue": yesterday_revenue,
            "month_revenue": month_revenue,
            "critical_stock": critical_stock,
            "low_stock": low_stock,
            "active_event": active_event.dict() if active_event else None
        }

        print("DASHBOARD RESPONSE:", response)
        return response

    except Exception as e:
        print("DASHBOARD ERROR")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))