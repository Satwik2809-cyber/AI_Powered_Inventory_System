import re
import math
from typing import Optional
from sqlmodel import Session, select, col
from database import engine
from models import Product, ProductBatch
from pydantic import BaseModel
import traceback
from thefuzz import process

def safe_float(value) -> float:
    """Return 0.0 for NaN/Infinity so JSON serialisation never crashes."""
    try:
        f = float(value)
        if math.isnan(f) or math.isinf(f):
            return 0.0
        return f
    except (TypeError, ValueError):
        return 0.0


# -----------------------------
# AI COMMAND OBJECT
# -----------------------------
class AICommand(BaseModel):
    text: str
    context: str
    user_id: int
    event_name: Optional[str] = None
    day_number: Optional[int] = None
    payment_mode: Optional[str] = "cash"

# -----------------------------
# INTENT DETECTION
# -----------------------------
def detect_intent(text: str, context: str = "") -> str:
    text = text.lower()

    if any(w in text for w in ["remove", "hatao", "delete", "cancel", "nikalo"]):
        return "remove"
    if any(w in text for w in ["bech", "becha", "sell", "bika", "dedo", "de do", "de", "dijiye"]):
        return "sell"
    if any(w in text for w in ["pack", "packing", "taiyar", "bandh"]):
        return "pack"
    if any(w in text for w in ["restock", "stock aaya", "aaya", "bhara", "refill"]):
        return "restock"
    if any(w in text for w in ["add", "jor", "dalo", "karo", "lagao"]):
        if context == "daily_sell":
            return "sell"
        if context == "restock":
            return "restock"
        if context == "packing":
            return "pack"
    if any(w in text for w in ["kitna", "bacha", "stock", "hai kya"]):
        return "check_stock"
    return "unknown"


NUMBER_WORDS = {
    "ek": 1, "do": 2, "teen": 3, "char": 4, "paanch": 5, "chah": 6, "che": 6,
    "saat": 7, "aath": 8, "nau": 9, "das": 10,
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
    "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "gyarah": 11, "barah": 12, "terah": 13, "chaudah": 14, "pandrah": 15,
    "solah": 16, "satrah": 17, "atharah": 18, "unnis": 19, "bees": 20,
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
    "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20,
    "tis": 30, "chalis": 40, "pachas": 50, "saath": 60, "sattar": 70,
    "assi": 80, "navve": 90, "sau": 100,
    "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70,
    "eighty": 80, "ninety": 90, "hundred": 100
}

def word_to_number(word: str) -> Optional[int]:
    return NUMBER_WORDS.get(word.lower(), None)

def clean_text(text: str) -> str:
    return re.sub(r"[|\.,?!]", " ", text)

def extract_quantity(text: str) -> int:
    """Extract a quantity from text. Returns 1 if nothing found."""
    words = text.split()
    for w in words:
        if w.isdigit():
            return int(w)
        num = word_to_number(w)
        if num:
            return num
    qty_patterns = [
        r"(\d+)\s*(?:pc|pcs|packet|pack|katar|box|botal|bottle|strip|patta)",
        r"^(\d+)\s",
        r"\s(\d+)$"
    ]
    for p in qty_patterns:
        m = re.search(p, text)
        if m:
            return int(m.group(1))
    return 1

def extract_rate_or_size(text: str) -> Optional[int]:
    match = re.search(r"\b(\d+)\s*(?:rs|rupaye|wala|MRP|ka)\b", text, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None

def extract_unit(text: str) -> Optional[str]:
    match = re.search(r"\b(\d+)\s*(ml|gm|g|kg|ltr|li|liter)\b", text, re.IGNORECASE)
    if match:
        return f"{match.group(1)}{match.group(2)}"
    return None

def extract_product_name(text: str) -> str:
    """Strip stop-words and number-words to leave just the product name."""
    stop_words = {
        "bech", "becha", "sell", "bika", "dedo", "de", "do", "dijiye",
        "pack", "packing", "taiyar", "karo", "kijiye", "karna",
        "add", "joro", "dalo", "daalo", "lagao", "rakho",
        "restock", "stock", "aaya", "hai",
        "remove", "hatao", "delete", "cancel", "nikalo",
        "aur", "and", "tatha", "evam", "with",
        "ka", "ki", "ke", "ko", "me", "mein", "par", "se",
        "wo", "woh", "ye", "yeh", "iss", "us", "iska", "uska",
        "wala", "wali", "wale",
        "ek", "do", "teen", "char", "paanch", "che", "saat", "aath", "nau", "das",
        "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
        "gyarah", "barah", "terah", "chaudah", "pandrah", "solah", "satrah",
        "atharah", "unnis", "bees",
        "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
        "seventeen", "eighteen", "nineteen", "twenty",
        "tis", "chalis", "pachas", "saath", "sattar", "assi", "navve", "sau",
        "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety", "hundred",
        "pcs", "packet", "box", "strip", "patta", "quantity", "qty",
        "rs", "rupaye", "rupees", "mrp",
        "bas", "hi", "bhi", "sirf", "please", "plz", "kripya"
    }
    words = text.split()
    product_words = []
    for w in words:
        w_lower = w.lower()
        # Keep short words (≤3 chars) — a single letter like "D" is a valid search
        if w_lower in stop_words and len(w_lower) > 2:
            continue
        if w.isdigit():
            continue
        product_words.append(w)
    return " ".join(product_words).strip()

def extract_items(text: str):
    items = []
    text = clean_text(text.lower())
    parts = re.split(r",|aur|and|\s+tatha\s+", text)
    for part in parts:
        part = part.strip()
        if not part:
            continue
        qty = extract_quantity(part)
        rate = extract_rate_or_size(part)
        unit = extract_unit(part)
        name = extract_product_name(part)
        if name:
            item_data: dict = {"name": name, "quantity": qty, "rate": rate}
            if unit:
                item_data["unit"] = unit
            items.append(item_data)
    return items


# -----------------------------
# SMART PRODUCT SEARCH
# Search priority:
#   1. If single letter → prefix match (starts with that letter)
#   2. Short word (≤4 chars) → starts-with match first, then contains
#   3. Longer word → contains (ilike) match
#   4. Always fall back to fuzzy matching on all candidates
#   5. NEVER return "not found" — always return the best candidates
# -----------------------------
def search_products(session: Session, search_term: str, candidates: list) -> tuple[list, list]:
    """
    Returns (exact_or_single_matches, ambiguous_matches).
    Always returns something — falls back to fuzzy if nothing found.
    """
    search_clean = search_term.strip().lower()
    candidate_names = [p.name for p in candidates]

    matched: list = []

    # ── STEP 1: Single letter → prefix match ────────────────────────────────
    if len(search_clean) == 1:
        matched = [p for p in candidates if p.name.lower().startswith(search_clean)]

    # ── STEP 2: Short word (2-4 chars) → prefix first, then anywhere ────────
    elif len(search_clean) <= 4:
        prefix_matches = [p for p in candidates if p.name.lower().startswith(search_clean)]
        if prefix_matches:
            matched = prefix_matches
        else:
            matched = [p for p in candidates if search_clean in p.name.lower()]

    # ── STEP 3: Normal word → substring (ilike equivalent) ──────────────────
    else:
        matched = [p for p in candidates if search_clean in p.name.lower()]

    # ── STEP 4: Fuzzy fallback — always runs, merges in good fuzzy hits ──────
    if candidate_names:
        # Use a lower threshold for short/single searches
        threshold = 40 if len(search_clean) <= 3 else 60
        best_matches = process.extract(search_clean, candidate_names, limit=8)
        for name, score in best_matches:
            if score >= threshold:
                p = next((c for c in candidates if c.name == name), None)
                if p and p not in matched:
                    matched.append(p)

    # ── STEP 5: Last resort — if STILL nothing, return top 5 fuzzy picks ─────
    if not matched and candidate_names:
        best_matches = process.extract(search_clean, candidate_names, limit=5)
        for name, score in best_matches:
            p = next((c for c in candidates if c.name == name), None)
            if p:
                matched.append(p)

    return matched


# -----------------------------
# MAIN AI HANDLER
# -----------------------------
def handle_ai_command(cmd: AICommand):
    cmd.text = clean_text(cmd.text)
    print(f"🎤 AI COMMAND: {cmd.text} | Context: {cmd.context}")

    try:
        intent = detect_intent(cmd.text, cmd.context)
        print(f"🧠 Detected Intent: {intent}")

        # Context-based default intent fallback
        if intent == "unknown":
            if cmd.context == "daily_sell":
                intent = "sell"
            elif cmd.context == "packing":
                intent = "pack"
            elif cmd.context == "restock":
                intent = "restock"

        items_data = extract_items(cmd.text)

        if not items_data:
            return {"error": "No items detected in your command. Please say the item name."}

        resolved_items = []
        ambiguous_matches = []

        with Session(engine) as session:

            # ── Fetch candidate pool based on context ────────────────────────
            if cmd.context == "event_sell" and cmd.event_name:
                from models import Event, EventStock
                event = session.exec(
                    select(Event).where(Event.name == cmd.event_name)
                ).first()
                if event:
                    event_product_ids = session.exec(
                        select(EventStock.product_id).where(
                            EventStock.event_id == event.id,
                            EventStock.quantity_remaining > 0
                        )
                    ).all()
                    candidates = session.exec(
                        select(Product).where(
                            col(Product.id).in_(event_product_ids),
                            Product.is_active == True  # noqa: E712
                        )
                    ).all()
                else:
                    candidates = session.exec(
                        select(Product).where(Product.is_active == True)  # noqa: E712
                    ).all()
            else:
                candidates = session.exec(
                    select(Product).where(Product.is_active == True)  # noqa: E712
                ).all()

            # ── Resolve each spoken item ─────────────────────────────────────
            for item in items_data:
                search_term = item["name"].strip()
                print(f"🔍 Searching for: '{search_term}' (qty: {item['quantity']})")

                # Rate filter: narrow candidates if rate was mentioned
                rate_filtered = candidates
                if item.get("rate"):
                    rate_filtered = [p for p in candidates if p.rate == item["rate"]]
                    if not rate_filtered:
                        rate_filtered = candidates  # fallback if rate filter yields nothing

                matched = search_products(session, search_term, rate_filtered)

                print(f"📦 Matches found: {[p.name for p in matched]}")

                # ── Build stock info for each match ──────────────────────────
                def product_with_stock(p) -> dict:
                    batches = session.exec(
                        select(ProductBatch).where(ProductBatch.product_id == p.id)
                    ).all()
                    return {
                        "id": p.id,
                        "name": p.name,
                        "category": p.category,
                        "rate": safe_float(p.rate),
                        "quantity": item["quantity"],
                        "stock": sum(b.quantity for b in batches),
                    }

                if len(matched) == 1:
                    # Exact / single match — add directly
                    resolved_items.append(product_with_stock(matched[0]))

                elif len(matched) > 1:
                    # Multiple matches — surface as ambiguity for user to pick
                    options = [
                        {**product_with_stock(p),
                         "confidence": 0.95 if p.name.lower() == search_term else 0.75}
                        for p in matched
                    ]
                    ambiguous_matches.append({
                        "query": search_term,
                        "options": options
                    })

                else:
                    # Should never reach here thanks to fuzzy fallback,
                    # but handle gracefully for remove intent
                    if intent == "remove":
                        resolved_items.append({"name": search_term})
                    else:
                        # Return a soft error in the item list — don't kill the whole request
                        ambiguous_matches.append({
                            "query": search_term,
                            "options": [],
                            "error": f"No products found for '{search_term}'"
                        })

        # ── RESPONSE ─────────────────────────────────────────────────────────
        if ambiguous_matches:
            return {
                "action": "ambiguous",
                "ambiguities": ambiguous_matches,
                "items": resolved_items
            }

        if intent == "remove":
            return {
                "action": "remove_from_cart",
                "items": resolved_items,
                "message": f"Removing {len(resolved_items)} items from cart"
            }

        if cmd.context in ["daily_sell", "event_sell"] and intent == "sell":
            return {
                "action": "add_to_cart",
                "items": resolved_items,
                "message": f"Added {len(resolved_items)} items to cart"
            }

        if cmd.context == "packing" and intent == "pack":
            return {
                "action": "add_to_cart",
                "items": resolved_items,
                "message": f"Added {len(resolved_items)} items to pack list"
            }

        if cmd.context == "restock" and intent == "restock":
            from inventory import restock_product
            results = []
            for ri in resolved_items:
                results.append(restock_product(name=ri["name"], quantity=ri["quantity"]))
            return results

        return {
            "error": "Command not understood",
            "intent": intent,
            "parsed_items": items_data
        }

    except Exception as e:
        print(f"❌ AI ERROR: {str(e)}")
        traceback.print_exc()
        raise e
