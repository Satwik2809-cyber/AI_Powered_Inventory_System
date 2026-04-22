from models import Alert
from datetime import date, datetime
from typing import List

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
        days_left = (item.expiry_date - date.today()).days

        if days_left < 0:
            push_alert(
                "expiry",
                "Item Expired",
                f"{item.name} has expired",
                "critical",
                item.id
            )
        elif days_left <= 7:
            push_alert(
                "expiry",
                "Expiry Warning",
                f"{item.name} expiring in {days_left} days",
                "warning",
                item.id
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
