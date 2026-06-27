from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_db
from datetime import date, datetime, timedelta
from typing import List, Optional, Dict
from pydantic import BaseModel
from models import Sale, Event, EventSale, Product, MonthlyCount, SaleItem, EventSaleItem, ProductBatch, User, StockHistory, EventStockHistory
import json
import math

def safe_float(val):
    if val is None:
        return 0.0
    try:
        f_val = float(val)
        if math.isnan(f_val) or math.isinf(f_val):
            return 0.0
        return f_val
    except (ValueError, TypeError):
        return 0.0

router = APIRouter(prefix="/reports", tags=["Reports"])

# ... existing summary, daily, events endpoints ...
@router.get("/summary")
def get_reports_summary(
    session: Session = Depends(get_db)
):
    try:
        today_utc = datetime.utcnow().date()
        today_start = datetime.combine(today_utc, datetime.min.time())
        month_start = today_start.replace(day=1)

        total_daily_revenue = session.exec(select(Sale)).all()
        total_event_revenue = session.exec(select(EventSale)).all()
        
        revenue_sum = sum(s.total_amount for s in total_daily_revenue) + sum(e.total_amount for e in total_event_revenue)

        today_sales = session.exec(select(Sale).where(Sale.created_at >= today_start)).all()
        today_event_sales = session.exec(select(EventSale).where(EventSale.created_at >= today_start)).all()
        
        today_rev = sum(s.total_amount for s in today_sales) + sum(e.total_amount for e in today_event_sales)

        events_count = len(session.exec(select(Event)).all())
        items_count = len(session.exec(select(Product)).all())

        return {
            "total_revenue": revenue_sum,
            "today_revenue": today_rev,
            "events_count": events_count,
            "items_count": items_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/daily")
def get_daily_sales(
    session: Session = Depends(get_db)
):
    try:
        today_utc = datetime.utcnow().date()
        today_start = datetime.combine(today_utc, datetime.min.time())
        sales = session.exec(select(Sale).where(Sale.created_at >= today_start).order_by(Sale.created_at.desc())).all()
        
        result = []
        for s in sales:
            result.append({
                "id": s.id,
                "title": s.buyer_name or "Cash Sale",
                "subtitle":f"{s.total_quantity} items • {s.payment_mode}",
                "value": s.total_amount,
                "timestamp": s.created_at
            })
        return result
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@router.get("/daily/breakdown")
def get_daily_sales_breakdown(session: Session = Depends(get_db)):
    """Per-user, per-product breakdown of today's daily sales (all users)."""
    try:
        today_utc = datetime.utcnow().date()
        today_start = datetime.combine(today_utc, datetime.min.time())
        sales = session.exec(
            select(Sale).where(Sale.created_at >= today_start).order_by(Sale.created_at.desc())
        ).all()

        user_product_breakdown: Dict[str, dict] = {}

        for s in sales:
            amt = safe_float(s.total_amount)
            if s.buyer_name:
                uid = s.buyer_name
            else:
                user = session.get(User, s.user_id)
                uid = user.username if user else f"User {s.user_id}"

            if uid not in user_product_breakdown:
                user_product_breakdown[uid] = {"total": 0.0, "products": {}}

            user_product_breakdown[uid]["total"] += amt

            items = session.exec(select(SaleItem).where(SaleItem.sale_id == s.id)).all()
            for item in items:
                product = session.get(Product, item.product_id)
                p_name = product.name if product else f"Product {item.product_id}"
                item_qty = safe_float(item.quantity)
                item_rate = safe_float(item.rate)
                item_amt = item_qty * item_rate

                if p_name not in user_product_breakdown[uid]["products"]:
                    user_product_breakdown[uid]["products"][p_name] = {"qty": 0.0, "amount": 0.0}
                user_product_breakdown[uid]["products"][p_name]["qty"] += item_qty
                user_product_breakdown[uid]["products"][p_name]["amount"] += item_amt

        result = []
        for user, data in user_product_breakdown.items():
            prod_list = [
                {"name": p, "qty": d["qty"], "amount": round(d["amount"], 2)}
                for p, d in data["products"].items()
            ]
            result.append({
                "user": user,
                "total_user_sales": round(data["total"], 2),
                "products": prod_list
            })

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/events")
def get_events_report(
     session: Session = Depends(get_db)
):
    try:
        events = session.exec(select(Event).order_by(Event.created_at.desc())).all()
        result = []
        for e in events:
            sales = session.exec(select(EventSale).where(EventSale.event_id == e.id)).all()
            revenue = sum(safe_float(s.total_amount) for s in sales)
            count = len(sales)

            # Per-user product breakdown
            user_map: Dict[str, dict] = {}
            for es in sales:
                user = session.get(User, es.user_id)
                uname = user.username if user else f"User {es.user_id}"
                if uname not in user_map:
                    user_map[uname] = {"total": 0.0, "products": {}}
                user_map[uname]["total"] += safe_float(es.total_amount)
                e_items = session.exec(select(EventSaleItem).where(EventSaleItem.event_sale_id == es.id)).all()
                for item in e_items:
                    product = session.get(Product, item.product_id)
                    p_name = product.name if product else f"Product {item.product_id}"
                    item_qty = safe_float(item.quantity)
                    item_rate = 0.0 if getattr(item, "is_gift", False) else safe_float(item.rate)
                    item_amt = item_qty * item_rate
                    if p_name not in user_map[uname]["products"]:
                        user_map[uname]["products"][p_name] = {"qty": 0.0, "amount": 0.0}
                    user_map[uname]["products"][p_name]["qty"] += item_qty
                    user_map[uname]["products"][p_name]["amount"] += item_amt

            user_breakdown = [
                {
                    "user": u,
                    "total": round(d["total"], 2),
                    "products": [
                        {"name": p, "qty": v["qty"], "amount": round(v["amount"], 2)}
                        for p, v in d["products"].items()
                    ]
                }
                for u, d in user_map.items()
            ]

            result.append({
                "id": e.id,
                "name": e.name,
                "status": e.status,
                "revenue": round(revenue, 2),
                "count": count,
                "mode": "multi-day" if e.is_multi_day else "single-day",
                "open_sell": e.selling_mode == "open_sell",
                "start_date": e.started_at.strftime("%Y-%m-%d") if e.started_at else "",
                "days": e.days,
                "user_breakdown": user_breakdown
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ... NEW MONTHLY WORKFLOW ...

@router.get("/monthly")
def get_monthly_report(
    month: int,
    year: int,
    session: Session = Depends(get_db)
):
    try:
        # Construct the start and end of the requested month
        # Note: JS `month` is 0-indexed, so add 1 for Python datetime
        target_month = month + 1
        target_year = year
        
        # Searching for a confirmed count that falls in this month
        # A simple approach: start_date's month/year matches
        reports = session.exec(
            select(MonthlyCount)
            .where(MonthlyCount.status == "confirmed")
        ).all()
        
        # Find the one that matches the requested period
        matching_report = None
        for r in reports:
            if r.start_date.month == target_month and r.start_date.year == target_year:
                matching_report = r
                break
                
        if not matching_report:
            raise HTTPException(404, "No report found for this period")
            
        return {
            "period": f"{matching_report.start_date.strftime('%Y-%m-%d')} to {matching_report.end_date.strftime('%Y-%m-%d') if matching_report.end_date else 'Now'}",
            "revenue": matching_report.grand_total,
            "transactions": json.loads(matching_report.detailed_report).get("daily_sales_count", 0) + json.loads(matching_report.detailed_report).get("event_sales_count", 0),
            "breakdown": json.loads(matching_report.detailed_report),
            "inventory_snapshot": json.loads(matching_report.inventory_snapshot) if matching_report.inventory_snapshot else []
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, detail=str(e))

@router.get("/monthly/status")
def get_monthly_status(session: Session = Depends(get_db)):
    # Check if there is an active counting session
    active = session.exec(
        select(MonthlyCount).where(MonthlyCount.status == "counting")
    ).first()
    
    if active:
        return {
            "status": "counting",
            "start_date": active.start_date,
            "id": active.id
        }
    return {"status": "none"}

class StartCountRequest(BaseModel):
    month: Optional[int] = None
    year: Optional[int] = None

@router.post("/monthly/start")
def start_monthly_count(
    req: StartCountRequest,
    session: Session = Depends(get_db)
):
    month = req.month
    year = req.year
    # 1. Check if already counting
    existing = session.exec(
        select(MonthlyCount).where(MonthlyCount.status == "counting")
    ).first()
    if existing:
        raise HTTPException(400, "Already in counting mode")

    # 2. Determine Start Date
    if month is not None and year is not None:
        # JS months are 0-indexed, but the backend stores as datetime. 
        # We'll use the provided month/year.
        start_date = datetime(year, month + 1, 1)
    else:
        # Look for last confirmed report.
        last_confirmed = session.exec(
            select(MonthlyCount)
            .where(MonthlyCount.status == "confirmed")
            .order_by(MonthlyCount.end_date.desc())
        ).first()
        
        if last_confirmed and last_confirmed.end_date:
             start_date = last_confirmed.end_date 
        else:
             now = datetime.utcnow()
             start_date = datetime(now.year, now.month, 1)

    # 3. Create Draft Record with Cutoff (End Date)
    now = datetime.utcnow()
    
    # Snapshot Inventory
    products = session.exec(select(Product)).all()
    inventory_snapshot = []
    
    for p in products:
        batches = session.exec(select(ProductBatch).where(ProductBatch.product_id == p.id)).all()
        qty = sum(b.quantity for b in batches)
        inventory_snapshot.append({
            "id": p.id,
            "name": p.name,
            "category": p.category,
            "rate": p.rate,
            "quantity": qty,
            "value": qty * p.rate
        })

    new_count = MonthlyCount(
        start_date=start_date,
        # end_date is NOT set yet. It stays None until finalized.
        created_by="Admin", 
        status="counting",
        inventory_snapshot=json.dumps(inventory_snapshot),
        detailed_report=json.dumps({}) 
    )
    
    session.add(new_count)
    session.commit()
    session.refresh(new_count)
    
    return {"message": "Monthly count started. Sales are now paused/redirected.", "id": new_count.id}

@router.get("/monthly/draft")
def get_monthly_draft_report(session: Session = Depends(get_db)):
    # Get active counting session
    count = session.exec(
        select(MonthlyCount).where(MonthlyCount.status == "counting")
    ).first()
    
    if not count:
         raise HTTPException(404, "No active monthly count")
         
    # Generate Report Data from start_date to NOW (Dynamic)
    end_date = datetime.utcnow()
    
    # 1. Sales Summary by User
    sales = session.exec(
        select(Sale).where(Sale.created_at >= count.start_date, Sale.created_at <= end_date)
    ).all()
    
    # Structure: UserID -> { product_name: {qty, amount} }
    user_product_breakdown = {}
    total_sales_revenue = 0
    total_cash = 0
    total_online = 0
    
    for s in sales:
        amt = safe_float(s.total_amount)
        total_sales_revenue += amt
        if s.payment_mode == 'cash':
            total_cash += amt
        else:
            total_online += amt
            
        if s.buyer_name:
            uid = s.buyer_name
        else:
            user = session.get(User, s.user_id)
            uid = user.username if user else f"User {s.user_id}"
        
        if uid not in user_product_breakdown:
            user_product_breakdown[uid] = {}
            
        # Get items for this sale
        items = session.exec(select(SaleItem).where(SaleItem.sale_id == s.id)).all()
        for item in items:
            product = session.get(Product, item.product_id)
            p_name = product.name if product else f"Product {item.product_id}"
            if p_name not in user_product_breakdown[uid]:
                 user_product_breakdown[uid][p_name] = {"qty": 0, "amount": 0}
            item_qty = safe_float(item.quantity)
            item_rate = safe_float(item.rate)
            user_product_breakdown[uid][p_name]["qty"] += item_qty
            user_product_breakdown[uid][p_name]["amount"] += (item_qty * item_rate)

    # Convert to list for easier frontend consumption
    # [ {user: "Name", products: [ {name, qty, amount} ]} ]
    formatted_breakdown = []
    for user, prods in user_product_breakdown.items():
        prod_list = [{"name": p, "qty": d["qty"], "amount": d["amount"]} for p, d in prods.items()]
        formatted_breakdown.append({
            "user": user,
            "total_user_sales": sum(p["amount"] for p in prod_list),
            "products": prod_list
        })
        
    daily_sales_log = {}
    for s in sales:
        date_str = s.created_at.strftime("%Y-%m-%d")
        if date_str not in daily_sales_log:
            daily_sales_log[date_str] = {"date": date_str, "total": 0, "items": {}}
        
        amt = safe_float(s.total_amount)
        daily_sales_log[date_str]["total"] += amt
        
        items = session.exec(select(SaleItem).where(SaleItem.sale_id == s.id)).all()
        for item in items:
            product = session.get(Product, item.product_id)
            p_name = product.name if product else f"Product {item.product_id}"
            if p_name not in daily_sales_log[date_str]["items"]:
                daily_sales_log[date_str]["items"][p_name] = {"qty": 0, "amount": 0}
            
            item_qty = safe_float(item.quantity)
            item_rate = safe_float(item.rate)
            daily_sales_log[date_str]["items"][p_name]["qty"] += item_qty
            daily_sales_log[date_str]["items"][p_name]["amount"] += (item_qty * item_rate)

    formatted_daily_log = []
    for d, data in daily_sales_log.items():
        items_list = [{"name": p, "qty": val["qty"], "amount": val["amount"]} for p, val in data["items"].items()]
        formatted_daily_log.append({
            "date": data["date"],
            "total": data["total"],
            "items": items_list
        })
    formatted_daily_log.sort(key=lambda x: x["date"], reverse=True)

    # 2. Event Sales Summary - Full breakdown per user and per event
    event_sales = session.exec(
        select(EventSale).where(EventSale.created_at >= count.start_date, EventSale.created_at <= end_date)
    ).all()
    
    total_event_revenue = 0
    total_event_cash = 0
    total_event_online = 0
    event_user_breakdown = {}   # username -> {event_name -> {product -> {qty, amount}}}
    event_daily_log = {}        # date -> {total, items: {product_name -> {qty, amount}}}

    for es in event_sales:
        amt = safe_float(es.total_amount)
        total_event_revenue += amt
        if es.payment_mode == 'cash':
            total_event_cash += amt
        else:
            total_event_online += amt

        user = session.get(User, es.user_id)
        uname = user.username if user else f"User {es.user_id}"
        event = session.get(Event, es.event_id)
        ename = event.name if event else f"Event {es.event_id}"

        if uname not in event_user_breakdown:
            event_user_breakdown[uname] = {}
        if ename not in event_user_breakdown[uname]:
            event_user_breakdown[uname][ename] = {}

        date_str = es.created_at.strftime("%Y-%m-%d")
        if date_str not in event_daily_log:
            event_daily_log[date_str] = {"date": date_str, "total": 0, "items": {}}
        event_daily_log[date_str]["total"] += amt

        e_items = session.exec(select(EventSaleItem).where(EventSaleItem.event_sale_id == es.id)).all()
        for item in e_items:
            product = session.get(Product, item.product_id)
            p_name = product.name if product else f"Product {item.product_id}"
            item_qty = safe_float(item.quantity)
            item_rate = safe_float(item.rate) if not getattr(item, 'is_gift', False) else 0.0
            item_amt = item_qty * item_rate

            # Per-user/event breakdown
            if p_name not in event_user_breakdown[uname][ename]:
                event_user_breakdown[uname][ename][p_name] = {"qty": 0, "amount": 0}
            event_user_breakdown[uname][ename][p_name]["qty"] += item_qty
            event_user_breakdown[uname][ename][p_name]["amount"] += item_amt

            # Date log
            if p_name not in event_daily_log[date_str]["items"]:
                event_daily_log[date_str]["items"][p_name] = {"qty": 0, "amount": 0}
            event_daily_log[date_str]["items"][p_name]["qty"] += item_qty
            event_daily_log[date_str]["items"][p_name]["amount"] += item_amt

    formatted_event_breakdown = []
    for uname, events_dict in event_user_breakdown.items():
        for ename, prods in events_dict.items():
            prod_list = [{"name": p, "qty": d["qty"], "amount": d["amount"]} for p, d in prods.items()]
            formatted_event_breakdown.append({
                "user": uname,
                "event": ename,
                "total_user_event_sales": sum(p["amount"] for p in prod_list),
                "products": prod_list
            })

    formatted_event_daily_log = sorted(
        [{"date": d, "total": data["total"], "items": [{"name": p, "qty": v["qty"], "amount": v["amount"]} for p, v in data["items"].items()]} for d, data in event_daily_log.items()],
        key=lambda x: x["date"], reverse=True
    )
    
    # 3. Inventory (Use snapshot)
    snapshot = json.loads(count.inventory_snapshot) if count.inventory_snapshot else []
    for item in snapshot:
        item['rate'] = safe_float(item.get('rate', 0))
        item['value'] = safe_float(item.get('value', 0))
        item['quantity'] = safe_float(item.get('quantity', 0))
        
    stock_value = sum(safe_float(item.get('value', 0)) for item in snapshot)

    # 4. Restocking History
    history_records = session.exec(
        select(StockHistory).where(StockHistory.created_at >= count.start_date, StockHistory.created_at <= end_date)
    ).all()
    
    restock_history = []
    for h in history_records:
        p = session.get(Product, h.product_id)
        restock_history.append({
            "product_name": p.name if p else f"Product {h.product_id}",
            "quantity": h.quantity,
            "date": h.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "restocked_by": h.restocked_by
        })

    event_history_records = session.exec(
        select(EventStockHistory).where(
            EventStockHistory.created_at >= count.start_date, 
            EventStockHistory.created_at <= end_date,
            EventStockHistory.action == "restocked"
        )
    ).all()
    
    for h in event_history_records:
        p = session.get(Product, h.product_id)
        user = session.get(User, h.user_id)
        restock_history.append({
            "product_name": p.name if p else f"Product {h.product_id}",
            "quantity": h.quantity,
            "date": h.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "restocked_by": f"{user.username if user else 'User'} (Event Restock)"
        })

    # 5. Transaction Log
    transaction_log = []
    def add_tx_log(sale_obj, is_event):
        amt = safe_float(sale_obj.total_amount)
        c = amt if sale_obj.payment_mode == 'cash' else 0
        o = amt if sale_obj.payment_mode != 'cash' else 0
        it_strs = []
        if is_event:
            items = session.exec(select(EventSaleItem).where(EventSaleItem.event_sale_id == sale_obj.id)).all()
        else:
            items = session.exec(select(SaleItem).where(SaleItem.sale_id == sale_obj.id)).all()
            
        for it in items:
            p = session.get(Product, it.product_id)
            n = p.name if p else f"Item {it.product_id}"
            if getattr(it, "is_gift", False):
                it_strs.append(f"{n} (x{it.quantity} @ ₹0 [Gift])")
            else:
                it_strs.append(f"{n} (x{it.quantity} @ ₹{it.rate})")
            
        transaction_log.append({
            "date": sale_obj.created_at.strftime("%Y-%m-%d"),
            "time": sale_obj.created_at.strftime("%H:%M:%S"),
            "exact_datetime": sale_obj.created_at.isoformat(),
            "amount": amt,
            "cash": c,
            "online": o,
            "items_str": ", ".join(it_strs),
            "type": "Event" if is_event else "Daily"
        })
        
    for s in sales: add_tx_log(s, False)
    for es in event_sales: add_tx_log(es, True)
    
    transaction_log.sort(key=lambda x: x["exact_datetime"], reverse=True)

    return {
        "period": {
            "start": count.start_date,
            "end": end_date
        },
        "revenue": {
            "daily_sales": total_sales_revenue,
            "daily_cash": total_cash,
            "daily_online": total_online,
            "event_sales": total_event_revenue,
            "event_cash": total_event_cash,
            "event_online": total_event_online,
            "total": total_sales_revenue + total_event_revenue
        },
        "breakdown": {
            "detailed_sales": formatted_breakdown,
            "daily_sales_log": formatted_daily_log,
            "event_breakdown": formatted_event_breakdown,
            "event_daily_log": formatted_event_daily_log,
            "transaction_log": transaction_log,
            "inventory_value": stock_value
        },
        "inventory_snapshot": snapshot,
        "restock_history": restock_history
    }

@router.post("/monthly/finalize")
def finalize_monthly_count(session: Session = Depends(get_db)):
    count = session.exec(
        select(MonthlyCount).where(MonthlyCount.status == "counting")
    ).first()
    
    if not count:
        raise HTTPException(404, "No active count to finalize")
        
    # Generate final stats same as draft
    end_date = datetime.utcnow()
    
    # ... (Repeat calculation or extract logic) ...
    # For brevity, let's trust the Draft logic or re-run:
    
    sales = session.exec(
        select(Sale).where(Sale.created_at >= count.start_date, Sale.created_at <= end_date)
    ).all()
    event_sales = session.exec(
        select(EventSale).where(EventSale.created_at >= count.start_date, EventSale.created_at <= end_date)
    ).all()
    
    daily_rev = sum(safe_float(s.total_amount) for s in sales)
    event_rev = sum(safe_float(e.total_amount) for e in event_sales)
    
    # Set Final End Date HERE
    count.end_date = end_date
    count.total_cash = 0
    count.total_online = 0
    
    # Split payment modes for accuracy
    for s in sales + event_sales:
        amt = safe_float(s.total_amount)
        if s.payment_mode == 'cash': count.total_cash += amt
        else: count.total_online += amt
            
    count.grand_total = daily_rev + event_rev
    count.status = "confirmed"
    
    # ── Daily Sales breakdown per user ──────────────────────────
    user_product_breakdown = {}
    daily_sales_log = {}
    
    for s in sales:
        if s.buyer_name:
            uid = s.buyer_name
        else:
            user = session.get(User, s.user_id)
            uid = user.username if user else f"User {s.user_id}"
        
        if uid not in user_product_breakdown: user_product_breakdown[uid] = {}
            
        date_str = s.created_at.strftime("%Y-%m-%d")
        if date_str not in daily_sales_log:
            daily_sales_log[date_str] = {"date": date_str, "total": 0, "items": {}}
        daily_sales_log[date_str]["total"] += safe_float(s.total_amount)

        items = session.exec(select(SaleItem).where(SaleItem.sale_id == s.id)).all()
        for item in items:
            product = session.get(Product, item.product_id)
            p_name = product.name if product else f"Product {item.product_id}"
            item_qty = safe_float(item.quantity)
            item_rate = safe_float(item.rate)
            item_amt = item_qty * item_rate
            
            if p_name not in user_product_breakdown[uid]:
                 user_product_breakdown[uid][p_name] = {"qty": 0, "amount": 0}
            user_product_breakdown[uid][p_name]["qty"] += item_qty
            user_product_breakdown[uid][p_name]["amount"] += item_amt

            if p_name not in daily_sales_log[date_str]["items"]:
                daily_sales_log[date_str]["items"][p_name] = {"qty": 0, "amount": 0}
            daily_sales_log[date_str]["items"][p_name]["qty"] += item_qty
            daily_sales_log[date_str]["items"][p_name]["amount"] += item_amt

    formatted_breakdown = []
    for usr, prods in user_product_breakdown.items():
        prod_list = [{"name": p, "qty": d["qty"], "amount": d["amount"]} for p, d in prods.items()]
        formatted_breakdown.append({
            "user": usr,
            "total_user_sales": sum(p["amount"] for p in prod_list),
            "products": prod_list
        })
    formatted_daily_log = sorted(
        [{"date": d, "total": data["total"], "items": [{"name": p, "qty": v["qty"], "amount": v["amount"]} for p, v in data["items"].items()]} for d, data in daily_sales_log.items()],
        key=lambda x: x["date"], reverse=True
    )
        
    # ── Event Sales breakdown per user and per event ────────────
    event_user_breakdown = {}
    event_daily_log = {}
    total_event_cash = 0
    total_event_online = 0

    for es in event_sales:
        amt = safe_float(es.total_amount)
        if es.payment_mode == 'cash': total_event_cash += amt
        else: total_event_online += amt

        user = session.get(User, es.user_id)
        uname = user.username if user else f"User {es.user_id}"
        event = session.get(Event, es.event_id)
        ename = event.name if event else f"Event {es.event_id}"

        if uname not in event_user_breakdown: event_user_breakdown[uname] = {}
        if ename not in event_user_breakdown[uname]: event_user_breakdown[uname][ename] = {}

        date_str = es.created_at.strftime("%Y-%m-%d")
        if date_str not in event_daily_log:
            event_daily_log[date_str] = {"date": date_str, "total": 0, "items": {}}
        event_daily_log[date_str]["total"] += amt

        e_items = session.exec(select(EventSaleItem).where(EventSaleItem.event_sale_id == es.id)).all()
        for item in e_items:
            product = session.get(Product, item.product_id)
            p_name = product.name if product else f"Product {item.product_id}"
            item_qty = safe_float(item.quantity)
            item_rate = 0.0 if getattr(item, 'is_gift', False) else safe_float(item.rate)
            item_amt = item_qty * item_rate

            if p_name not in event_user_breakdown[uname][ename]:
                event_user_breakdown[uname][ename][p_name] = {"qty": 0, "amount": 0}
            event_user_breakdown[uname][ename][p_name]["qty"] += item_qty
            event_user_breakdown[uname][ename][p_name]["amount"] += item_amt

            if p_name not in event_daily_log[date_str]["items"]:
                event_daily_log[date_str]["items"][p_name] = {"qty": 0, "amount": 0}
            event_daily_log[date_str]["items"][p_name]["qty"] += item_qty
            event_daily_log[date_str]["items"][p_name]["amount"] += item_amt

    formatted_event_breakdown = []
    for uname, events_dict in event_user_breakdown.items():
        for ename, prods in events_dict.items():
            prod_list = [{"name": p, "qty": d["qty"], "amount": d["amount"]} for p, d in prods.items()]
            formatted_event_breakdown.append({
                "user": uname, "event": ename,
                "total_user_event_sales": sum(p["amount"] for p in prod_list),
                "products": prod_list
            })
    formatted_event_daily_log = sorted(
        [{"date": d, "total": data["total"], "items": [{"name": p, "qty": v["qty"], "amount": v["amount"]} for p, v in data["items"].items()]} for d, data in event_daily_log.items()],
        key=lambda x: x["date"], reverse=True
    )

    # ── Restock History ─────────────────────────────────────────
    restock_history = []
    for h in session.exec(select(StockHistory).where(StockHistory.created_at >= count.start_date, StockHistory.created_at <= end_date)).all():
        p = session.get(Product, h.product_id)
        restock_history.append({"product_name": p.name if p else f"Product {h.product_id}", "quantity": h.quantity, "date": h.created_at.strftime("%Y-%m-%d %H:%M:%S"), "restocked_by": h.restocked_by})
    for h in session.exec(select(EventStockHistory).where(EventStockHistory.created_at >= count.start_date, EventStockHistory.created_at <= end_date, EventStockHistory.action == "restocked")).all():
        p = session.get(Product, h.product_id)
        u = session.get(User, h.user_id)
        restock_history.append({"product_name": p.name if p else f"Product {h.product_id}", "quantity": h.quantity, "date": h.created_at.strftime("%Y-%m-%d %H:%M:%S"), "restocked_by": f"{u.username if u else 'User'} (Event Restock)"})

    # ── Save complete detailed_report ────────────────────────────
    detailed = {
        "daily_sales_count": len(sales),
        "event_sales_count": len(event_sales),
        "generated_at": str(datetime.utcnow()),
        "daily_revenue": daily_rev,
        "event_revenue": event_rev,
        "total_revenue": daily_rev + event_rev,
        "daily_cash": count.total_cash,
        "daily_online": count.total_online,
        "event_cash": total_event_cash,
        "event_online": total_event_online,
        "breakdown": formatted_breakdown,
        "daily_sales_log": formatted_daily_log,
        "event_breakdown": formatted_event_breakdown,
        "event_daily_log": formatted_event_daily_log,
        "restock_history": restock_history
    }
    count.detailed_report = json.dumps(detailed)
    
    session.commit()
    
    return {"message": "Monthly count finalized and locked. New count will start fresh from this date.", "period_end": str(end_date)}
        
@router.post("/monthly/cancel")
def cancel_monthly_count(session: Session = Depends(get_db)):
    count = session.exec(
        select(MonthlyCount).where(MonthlyCount.status == "counting")
    ).first()
    
    if not count:
        raise HTTPException(404, "No active count to cancel")
        
    session.delete(count)
    session.commit()
    
    return {"message": "Monthly count cancelled and state reset."}

import pandas as pd
import io
from fastapi.responses import StreamingResponse

@router.get("/monthly/export/excel")
def export_monthly_report_excel(
    month: int,
    year: int,
    two_sheets: bool = False,
    session: Session = Depends(get_db)
):
    # Reuse the logic from get_monthly_report to find the data
    target_month = month + 1
    target_year = year
    
    reports = session.exec(
        select(MonthlyCount)
        .where(MonthlyCount.status == "confirmed")
    ).all()
    
    matching_report = None
    for r in reports:
        if r.start_date.month == target_month and r.start_date.year == target_year:
            matching_report = r
            break
            
    if not matching_report:
        # Check for active draft if requested month is current month
        active = session.exec(
            select(MonthlyCount).where(MonthlyCount.status == "counting")
        ).first()
        if active and active.start_date.month == target_month and active.start_date.year == target_year:
            matching_report = active
        else:
            raise HTTPException(404, "No report found for this period")

    detailed_data = json.loads(matching_report.detailed_report)
    
    # Sheet 1: Inventory Snapshot
    inventory_snapshot = []
    if matching_report.inventory_snapshot:
        inventory_snapshot = json.loads(matching_report.inventory_snapshot)
        
    inv_rows = []
    for item in inventory_snapshot:
        inv_rows.append({
            "Item Name": item.get("name", "N/A"),
            "Rate": safe_float(item.get("rate", 0)),
            "Quantity Left": safe_float(item.get("quantity", 0)),
            "Total Value": safe_float(item.get("value", 0))
        })
    df_inventory = pd.DataFrame(inv_rows)

    # Sheet 2: Sales Analysis (Full transaction log)
    # Fetch all sales in the confirmed report's period
    end_date = matching_report.end_date or datetime.utcnow()
    sales = session.exec(
        select(Sale).where(Sale.created_at >= matching_report.start_date, Sale.created_at <= end_date)
    ).all()
    event_sales = session.exec(
        select(EventSale).where(EventSale.created_at >= matching_report.start_date, EventSale.created_at <= end_date)
    ).all()
    
    transaction_rows = []
    
    def add_tx_log_excel(sale_obj, is_event):
        amt = safe_float(sale_obj.total_amount)
        c = amt if sale_obj.payment_mode == 'cash' else 0
        o = amt if sale_obj.payment_mode != 'cash' else 0
        it_strs = []
        if is_event:
            items = session.exec(select(EventSaleItem).where(EventSaleItem.event_sale_id == sale_obj.id)).all()
        else:
            items = session.exec(select(SaleItem).where(SaleItem.sale_id == sale_obj.id)).all()
            
        for it in items:
            p = session.get(Product, it.product_id)
            n = p.name if p else f"Item {it.product_id}"
            if getattr(it, "is_gift", False):
                it_strs.append(f"{n} (x{it.quantity} @ ₹0 [Gift])")
            else:
                it_strs.append(f"{n} (x{it.quantity} @ ₹{it.rate})")
            
        if is_event:
            user = session.get(User, sale_obj.user_id)
            buyer = user.username if user else f"User {sale_obj.user_id}"
        else:
            if sale_obj.buyer_name:
                buyer = sale_obj.buyer_name
            else:
                user = session.get(User, sale_obj.user_id)
                buyer = user.username if user else f"User {sale_obj.user_id}"
        
        transaction_rows.append({
            "Date": sale_obj.created_at.strftime("%Y-%m-%d"),
            "Time": sale_obj.created_at.strftime("%H:%M:%S"),
            "Type": "Event" if is_event else "Daily",
            "Buyer/User": buyer,
            "Items": ", ".join(it_strs),
            "Total Amount": amt,
            "Cash": c,
            "Online": o
        })
        
    for s in sales: add_tx_log_excel(s, False)
    for es in event_sales: add_tx_log_excel(es, True)
    
    transaction_rows.sort(key=lambda x: (x["Date"], x["Time"]), reverse=True)
    df_sales = pd.DataFrame(transaction_rows)

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        if not df_inventory.empty:
            df_inventory.to_excel(writer, index=False, sheet_name="Inventory Snapshot")
        else:
            pd.DataFrame([{"Message": "No inventory snapshot available"}]).to_excel(writer, index=False, sheet_name="Inventory Snapshot")
            
        if not df_sales.empty:
            df_sales.to_excel(writer, index=False, sheet_name="Sales Analysis")
        else:
            pd.DataFrame([{"Message": "No sales transactions found"}]).to_excel(writer, index=False, sheet_name="Sales Analysis")

    output.seek(0)
    filename = f"Monthly_Report_{year}_{month+1}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
