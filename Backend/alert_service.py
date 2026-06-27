from models import Alert, Product, ProductBatch
from datetime import date, datetime, timedelta
from typing import List
from sqlmodel import Session, select

alerts: List[Alert] = []
alert_id = 1

# ---------------- PUSH ALERT ---------------- #

def push_alert(type, title, message, severity="info", related_id=None):
    global alert_id

    alerts.append(
        Alert(
            id=alert_id,
            type=type,
            title=title,
            message=message,
            severity=severity,
            related_id=related_id,
            created_at=datetime.utcnow(),
            seen=False
        )
    )
    alert_id += 1


# ---------------- INVENTORY ALERTS ---------------- #

def check_inventory_alerts(item):
    # STOCK
    if item.quantity <= 5:
        push_alert(
            "inventory",
            "Critical Stock",
            f"{item.name} stock critically low ({item.quantity})",
            "critical",
            item.id
        )
    elif item.quantity <= 15:
        push_alert(
            "inventory",
            "Low Stock",
            f"{item.name} stock running low ({item.quantity})",
            "warning",
            item.id
        )

    # EXPIRY
    if item.expiry_date:
        if isinstance(item.expiry_date, str):
            try:
                exp_date = datetime.strptime(item.expiry_date, "%Y-%m-%d").date()
            except:
                return
        else:
            exp_date = item.expiry_date

        days_left = (exp_date - date.today()).days

        if days_left < 0:
            # Check if this exact alert already exists
            if not any(a.type == "expiry" and a.related_id == item.id and "expired" in a.message for a in alerts):
                push_alert(
                    "expiry",
                    "Item Expired",
                    f"{item.name} has expired",
                    "critical",
                    item.id
                )
        elif days_left <= 7:
            if not any(a.type == "expiry" and a.related_id == item.id and "expiring" in a.message for a in alerts):
                push_alert(
                    "expiry",
                    "Expiry Warning",
                    f"{item.name} expiring in {days_left} days",
                    "warning",
                    item.id
                )

def refresh_inventory_alerts(session: Session):
    # Check all active batches for expiry and stock levels
    batches = session.exec(select(ProductBatch).where(ProductBatch.quantity > 0)).all()
    for b in batches:
        product = session.get(Product, b.product_id)
        if product and product.is_active:
            # Create a temporary object for check_inventory_alerts
            class ItemProxy:
                def __init__(self, p, b):
                    self.id = p.id
                    self.name = p.name
                    self.quantity = b.quantity
                    self.expiry_date = b.expiry_date
            check_inventory_alerts(ItemProxy(product, b))

    # Also check EventStock levels for low stock
    from models import EventStock, Event
    event_stocks = session.exec(select(EventStock).where(EventStock.quantity_remaining > 0)).all()
    for estock in event_stocks:
        event = session.get(Event, estock.event_id)
        if event and event.status in ["active", "packing"]:
            if estock.quantity_remaining <= 5:
                product = session.get(Product, estock.product_id)
                if product:
                    push_alert(
                        "event",
                        "Critical Event Stock",
                        f"{product.name} running critically low at {event.name} ({estock.quantity_remaining} left)",
                        "critical",
                        estock.id
                    )
            elif estock.quantity_remaining <= 15:
                product = session.get(Product, estock.product_id)
                if product:
                    push_alert(
                        "event",
                        "Low Event Stock",
                        f"{product.name} running low at {event.name} ({estock.quantity_remaining} left)",
                        "warning",
                        estock.id
                    )

# ---------------- SALE ALERT ---------------- #


def on_sale_created(sale):
    push_alert(
        "sale",
        "New Sale Recorded",
        f"{sale.quantity} × {sale.item_name} sold by {sale.sold_by}",
        "info",
        sale.id
    )


# ---------------- EVENT ALERT ---------------- #

def on_event_status_change(event, old_status):
    push_alert(
        "event",
        "Event Update",
        f"{event.name}: {old_status} → {event.status}",
        "info",
        event.id
    )


# ---------------- API HELPERS ---------------- #

def get_alerts():
    return alerts[::-1]  # latest first

def mark_alert_seen(alert_id: int):
    for a in alerts:
        if a.id == alert_id:
            a.seen = True
