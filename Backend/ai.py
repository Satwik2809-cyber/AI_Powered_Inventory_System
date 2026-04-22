import re
from typing import Optional, List, Dict
from sqlmodel import Session, select
from database import engine
from models import Product, DailySaleRequest, DailySaleItemRequest, ProductBatch
from sales_and_events import daily_sale, event_sell, pack_items_for_event
from pydantic import BaseModel
import traceback
from thefuzz import process

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
# -----------------------------
# INTENT DETECTION
# -----------------------------
# -----------------------------
# INTENT DETECTION
# -----------------------------
def detect_intent(text: str, context: str = "") -> str:
    text = text.lower()
    
    # Remove/Delete keywords
    if any(w in text for w in ["remove", "hatao", "delete", "cancel", "nikalo"]):
        return "remove"

    # Sell keywords
    if any(w in text for w in ["bech", "becha", "sell", "bika", "dedo", "de do", "de", "dijiye"]):
        return "sell"
    
    # Pack keywords
    if any(w in text for w in ["pack", "packing", "taiyar", "bandh"]):
        return "pack"
    
    # Restock keywords (CAREFUL: "add" can be ambiguous)
    if any(w in text for w in ["restock", "stock aaya", "aaya", "bhara", "refill"]):
        return "restock"

    # "Add" handling - specific to context
    # "add", "joro", "dalo", "karo"
    if any(w in text for w in ["add", "jor", "dalo", "karo", "lagao"]):
        if context == "daily_sell":
            return "sell"   # "Add 2 paracetamol" -> Add to cart
        if context == "restock":
            return "restock"
        if context == "packing":
            return "pack"
        
    if any(w in text for w in ["kitna", "bacha", "stock", "hai kya"]):
        return "check_stock"
        
    return "unknown"

NUMBER_WORDS = {
    # 1-10
    "ek": 1, "do": 2, "teen": 3, "char": 4, "paanch": 5, "chah": 6, "che": 6, "saat": 7, "aath": 8, "nau": 9, "das": 10,
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    
    # 11-20 (Hindi)
    "gyarah": 11, "barah": 12, "terah": 13, "chaudah": 14, "pandrah": 15, 
    "solah": 16, "satrah": 17, "atharah": 18, "unnis": 19, "bees": 20,
    
    # 11-20 (English)
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
    "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20,
    
    # Tens
    "tis": 30, "chalis": 40, "pachas": 50, "saath": 60, "sattar": 70, "assi": 80, "navve": 90, "sau": 100,
    "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90, "hundred": 100
}

def word_to_number(word: str):
    return NUMBER_WORDS.get(word.lower(), None)

# -----------------------------
# ITEM EXTRACTION (MULTI)
# -----------------------------
def clean_text(text: str) -> str:
    # Remove punctuation: | . , ? !
    return re.sub(r"[\|\.\,\?\!]", " ", text)

def extract_quantity(text: str) -> int:
    words = text.split()
    for w in words:
        if w.isdigit():
            return int(w)
        num = word_to_number(w)
        if num:
            return num
    
    # Look for explicit quantity patterns
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
    # Comprehensive Hindi/Hinglish Stop Words
    stop_words = {
        # Verbs / Actions
        "bech", "becha", "sell", "bika", "dedo", "de", "do", "dijiye",
        "pack", "packing", "taiyar", "karo", "kijiye", "karna",
        "add", "joro", "dalo", "daalo", "lagao", "rakho",
        "restock", "stock", "aaya", "hai",
        "remove", "hatao", "delete", "cancel", "nikalo",
        
        # Prepositions / Connectors / Pronouns
        "aur", "and", "tatha", "evam", "with",
        "ka", "ki", "ke", "ko", "me", "mein", "par", "se",
        "wo", "woh", "ye", "yeh", "iss", "us", "iska", "uska",
        "wala", "wali", "wale",
        
        # Quantifiers / Fillers
        "ek", "do", "teen", "char", "paanch", "che", "saat", "aath", "nau", "das",
        "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
        "gyarah", "barah", "terah", "chaudah", "pandrah", "solah", "satrah", "atharah", "unnis", "bees",
        "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
        "tis", "chalis", "pachas", "saath", "sattar", "assi", "navve", "sau",
        "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety", "hundred",
        "pcs", "packet", "pack", "box", "strip", "patta", "quantity", "qty",
        "rs", "rupaye", "rupees", "mrp",
        "bas", "hi", "bhi", "sirf", "please", "plz", "kripya"
    }
    
    words = text.split()
    product_words = []
    
    for w in words:
        w_lower = w.lower()
        if w_lower in stop_words:
            continue
        if w.isdigit(): 
            continue
        product_words.append(w)

    return " ".join(product_words).strip()

def extract_items(text: str):
    items = []
    # Clean punctuation first
    text = clean_text(text.lower())
    
    # Split by conjunctions to handle multiple items
    # e.g. "2 paracetamol AUR 1 vicks"
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
            item_data = {
                "name": name,
                "quantity": qty,
                "rate": rate
            }
            if unit:
                item_data["unit"] = unit
            items.append(item_data)
    return items

# -----------------------------
# MAIN AI HANDLER
# -----------------------------
def handle_ai_command(cmd: AICommand):
    # Normalize command text
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
            return {"error": "No items detected"}

        resolved_items = []
        ambiguous_matches = []

        with Session(engine) as session:
            for item in items_data:
                # 1. Search Logic
                query = select(Product).where(Product.name.ilike(f"%{item['name']}%"), Product.is_active == True)
                if item['rate']:
                     query = query.where(Product.rate == item['rate'])
                
                if cmd.context == "event_sell" and cmd.event_name:
                    from models import Event, EventItem
                    event = session.exec(select(Event).where(Event.name == cmd.event_name)).first()
                    if event:
                        event_item_query = select(EventItem.product_id).where(EventItem.event_id == event.id, EventItem.quantity_remaining > 0)
                        query = query.where(Product.id.in_(event_item_query))
                
                products = session.exec(query).all()
                
                # 2. Fallback to exact match if broad match fails
                if not products:
                     query_exact = select(Product).where(Product.name == item['name'], Product.is_active == True)
                     if cmd.context == "event_sell" and cmd.event_name and 'event' in locals() and event:
                         query_exact = query_exact.where(Product.id.in_(event_item_query))
                     products = session.exec(query_exact).all()

                # 3. FUZZY MATCH FALLBACK (New)
                if not products:
                    # Fetch active product names to compare against
                    if cmd.context == "event_sell" and cmd.event_name and 'event' in locals() and event:
                        all_products = session.exec(select(Product).where(Product.id.in_(event_item_query), Product.is_active == True)).all()
                    else:
                        all_products = session.exec(select(Product).where(Product.is_active == True)).all()
                        
                    product_names = [p.name for p in all_products]
                    
                    search_term = item['name'].lower()
                    substring_matched_names = [name for name in product_names if search_term in name.lower()]

                    # If we found substring matches, bypass fuzzy math and use them directly!
                    if substring_matched_names:
                        print(f"🔍 Substring Match Found: '{item['name']}' -> {substring_matched_names}")
                        products = [p for p in all_products if p.name in substring_matched_names]
                    else:
                        # Fuzzy extract top matches
                        best_matches = process.extract(item['name'], product_names, limit=10)
                        
                        if best_matches:
                            top_score = best_matches[0][1]
                            if top_score >= 60: # More lenient base match requirement
                                # Cluster matches: get anything within 15 points of the best score
                                valid_matched_names = [name for name, score in best_matches if score >= top_score - 15 and score >= 60]
                                print(f"🔍 Fuzzy Match Cluster: '{item['name']}' -> {valid_matched_names} (Top Score: {top_score})")
                                
                                # Find the product objects for these matched names
                                products = [p for p in all_products if p.name in valid_matched_names]


                # 3. Handle Results
                if len(products) == 1:
                    product = products[0]
                    # Calculate stock
                    stock_batches = session.exec(
                        select(ProductBatch).where(ProductBatch.product_id == product.id)
                    ).all()
                    total_stock = sum(b.quantity for b in stock_batches)

                    resolved_items.append({
                        "id": product.id,
                        "name": product.name,
                        "category": product.category,
                        "rate": product.rate,
                        "quantity": item['quantity'], # Requested qty
                        "stock": total_stock          # Available stock
                    })
                elif len(products) > 1:
                    # AMBIGUITY DETECTED
                    matches = []
                    for p in products:
                        # Calculate stock for each option
                        stock_batches = session.exec(
                            select(ProductBatch).where(ProductBatch.product_id == p.id)
                        ).all()
                        total_stock = sum(b.quantity for b in stock_batches)

                        matches.append({
                            "id": p.id,
                            "name": p.name,
                            "category": p.category,
                            "rate": p.rate,
                            "quantity": item['quantity'],
                            "stock": total_stock,
                            "confidence": 0.9 if p.name.lower() == item['name'].lower() else 0.7
                        })
                    ambiguous_matches.append({
                        "query": item['name'],
                        "options": matches
                    })
                else:
                    # If intent is remove, we might still want to pass the name even if not found in DB?
                    # But ideally we remove by valid product name.
                    # If not found, we can't really remove reliably unless we pass the raw name.
                    if intent == "remove":
                         resolved_items.append({
                             "name": item['name'] # Just pass the name for frontend to try matching
                         })
                    else:
                         return {"error": f"Product not found: {item['name']}"}

        # --- RESPONSE HANDLING ---

        # If we have ANY ambiguity, return it immediately so user can choose
        if ambiguous_matches:
            return {
                "action": "ambiguous",
                "ambiguities": ambiguous_matches,
                "items": resolved_items # Send what we found so far too
            }
        
        # REMOVE INTENT
        if intent == "remove":
            return {
                "action": "remove_from_cart",
                "items": resolved_items,
                "message": f"Removing {len(resolved_items)} items from cart"
            }

        # SELL COMMANDS -> Add to Cart (Don't execute sale yet)
        if cmd.context in ["daily_sell", "event_sell"] and intent == "sell":
            return {
                "action": "add_to_cart",
                "items": resolved_items,
                "message": f"Added {len(resolved_items)} items to cart"
            }

        # EVENT PACKING -> Add to Cart
        if cmd.context == "packing" and intent == "pack":
            return {
                "action": "add_to_cart",
                "items": resolved_items,
                "message": f"Added {len(resolved_items)} items to pack list"
            }

        # RESTOCK
        if cmd.context == "restock" and intent == "restock":
            from inventory import restock_product
            results = []
            for ri in resolved_items:
                 results.append(
                    restock_product(
                         name=ri['name'],
                         quantity=ri['quantity'],
                    )
                 )
            return results

        return {"error": "Command not understood", "intent": intent, "parsed_items": items_data}

    except Exception as e:
        # Log exception
        print(f"❌ AI ERROR: {str(e)}")
        traceback.print_exc()
        with open("backend_debug.log", "a") as f:
            f.write(f"ERROR: {str(e)}\n")
            f.write(traceback.format_exc())
            f.write("\n" + "-"*20 + "\n")
        raise e
