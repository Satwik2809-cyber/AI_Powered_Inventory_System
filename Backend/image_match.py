import os
import torch
import numpy as np
from PIL import Image
from torchvision import models, transforms
from sqlmodel import select
from sqlalchemy.orm import Session
from thefuzz import process
import re
import easyocr

from models import Product
from database import engine

# Initialize OCR Reader (Gracefully fallback to CPU if GPU isn't available)
try:
    ocr_reader = easyocr.Reader(['en'], gpu=True)
except Exception:
    ocr_reader = easyocr.Reader(['en'], gpu=False)

# =========================================================
# 🔹 MODEL LOAD (ONCE)
# =========================================================

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

_base_model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)
_base_model.eval()
_base_model.to(DEVICE)

# Remove classifier → use embeddings
feature_extractor = torch.nn.Sequential(
    *_base_model.features,
    torch.nn.AdaptiveAvgPool2d((1, 1))
)

# =========================================================
# 🔹 IMAGE TRANSFORM
# =========================================================

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])

# =========================================================
# 🔹 EMBEDDING EXTRACTION
# =========================================================

def extract_embedding(image_path: str) -> np.ndarray:
    image = Image.open(image_path).convert("RGB")
    tensor = transform(image).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        features = feature_extractor(tensor)

    return features.view(-1).cpu().numpy()

# =========================================================
# 🔹 COSINE SIMILARITY (SAFE)
# =========================================================

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = (np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)

# Cache for embeddings from the product_images folder
_image_embeddings_cache = {}

def get_cached_embedding(image_path: str) -> np.ndarray:
    if image_path not in _image_embeddings_cache:
        _image_embeddings_cache[image_path] = extract_embedding(image_path)
    return _image_embeddings_cache[image_path]

# =========================================================
# 🔹 IMAGE MATCHING (DB DRIVEN)
# =========================================================

def match_product_image(uploaded_image_path: str, top_k: int = 5, context: str = None, event_name: str = None):
    results = []
    
    # Pre-fetch all active products for matching
    with Session(engine) as session:
        if context == "event_sell" and event_name:
            from models import Event, EventItem
            event = session.query(Event).filter(Event.name == event_name).first()
            if event:
                event_items = session.query(EventItem.product_id).filter(EventItem.event_id == event.id, EventItem.quantity_remaining > 0).all()
                valid_product_ids = [item.product_id for item in event_items]
                all_products = session.query(Product).filter(Product.id.in_(valid_product_ids), Product.is_active == True).all()
            else:
                # If event_id is provided but event not found, or no items, fallback to all active products
                all_products = session.query(Product).filter(Product.is_active == True).all()
        else:
            all_products = session.query(Product).filter(Product.is_active == True).all()
            
        product_names = {p.name: p for p in all_products}

    if not product_names:
        return []

    # =========================================================
    # 🔹 PASS 1: OCR TEXT EXTRACTION
    # =========================================================
    try:
        ocr_results = ocr_reader.readtext(uploaded_image_path)
        extracted_text = " ".join([text for (_, text, _) in ocr_results]).strip()
        
        if len(extracted_text) > 2:
            extracted_lower = extracted_text.lower()
            substring_matches = []
            
            # Substring exact check first
            for db_name, db_product in product_names.items():
                if extracted_lower in db_name.lower():
                    substring_matches.append(db_product)
                    if not any(r["product_id"] == db_product.id for r in results):
                        results.append({
                            "product_id": db_product.id,
                            "name": db_product.name,
                            "rate": db_product.rate,
                            "confidence": 0.95, # Massive boost
                            "matched_from": f"OCR Substring: '{extracted_text}'"
                        })
                        
            # If substring got highly confident hits, return immediately to cluster variants
            if substring_matches:
                results.sort(key=lambda x: x["confidence"], reverse=True)
                return results[:top_k]

            # Otherwise, fallback to Fuzzy loop...
            best_matches = process.extract(extracted_text, list(product_names.keys()), limit=top_k)
            
            for matched_db_name, score in best_matches:
                if score >= 55: # If the text similarity is decent
                    db_product = product_names[matched_db_name]
                    # Map Fuzz score (0-100) to our confidence range (0.0-1.0)
                    confidence = round(score / 100.0, 3) 
                    
                    # Boost confidence slightly if it was an OCR match to prioritize text matches
                    confidence = min(1.0, confidence + 0.1)

                    if not any(r["product_id"] == db_product.id for r in results):
                        results.append({
                            "product_id": db_product.id,
                            "name": db_product.name,
                            "rate": db_product.rate,
                            "confidence": confidence,
                            "matched_from": f"OCR: '{extracted_text}'"
                        })
            
            # If we got a very high confidence OCR match, or multiple solid ones, return early!
            if results and any(r["confidence"] >= 0.70 for r in results):
                results.sort(key=lambda x: x["confidence"], reverse=True)
                return results[:top_k]
    except Exception as e:
        print(f"OCR Pass failed: {e}")

    # =========================================================
    # 🔹 PASS 2: VISUAL EMBEDDING FALLBACK
    # =========================================================
    uploaded_embedding = extract_embedding(uploaded_image_path)

    product_images_dir = os.path.join(os.path.dirname(__file__), "product_images")
    if not os.path.exists(product_images_dir):
        # Sort what we have so far (if anything from OCR)
        results.sort(key=lambda x: x["confidence"], reverse=True)
        return results[:top_k]

    image_matches = []
    for filename in os.listdir(product_images_dir):
        if not filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            continue
            
        full_path = os.path.join(product_images_dir, filename)
        
        try:
            ref_embedding = get_cached_embedding(full_path)
            score = cosine_similarity(uploaded_embedding, ref_embedding)
            
            name_guess = os.path.splitext(filename)[0].replace("_", " ").strip()
            
            image_matches.append({
                "filename": filename,
                "name_guess": name_guess,
                "score": score
            })
        except Exception as e:
            print(f"Error processing image {filename}: {e}")
            
    # Sort by visual similarity
    image_matches.sort(key=lambda x: x["score"], reverse=True)
    top_image_matches = image_matches[:top_k]
    
    for pmatch in top_image_matches:
        best_match = process.extractOne(pmatch["name_guess"], list(product_names.keys()), score_cutoff=60)
        
        if best_match:
            matched_db_name, _ = best_match
            db_product = product_names[matched_db_name]
            
            if not any(r["product_id"] == db_product.id for r in results):
                results.append({
                    "product_id": db_product.id,
                    "name": db_product.name,
                    "rate": db_product.rate,
                    "confidence": round(pmatch["score"], 3),
                    "matched_from": pmatch["filename"]
                })
                    
    results.sort(key=lambda x: x["confidence"], reverse=True)
    return results[:top_k]

# =========================================================
# 🔹 DECISION LOGIC (AI BRAIN)
# =========================================================

def decide_image_match(results):
    if not results:
        return {
            "status": "error",
            "message": "No matching products found in database or images folder"
        }

    top = results[0]

    # ✅ Auto select
    if top["confidence"] >= 0.85:
        return {
            "status": "auto",
            "product": top
        }

    # 🤔 Ask user confirmation
    if top["confidence"] >= 0.65:
        return {
            "status": "confirm",
            "options": results
        }

    # ❌ Reject
    return {
        "status": "reject",
        "message": "Image unclear or not found, please try again"
    }
