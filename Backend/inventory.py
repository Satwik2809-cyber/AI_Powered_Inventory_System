from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.responses import StreamingResponse
import io
from sqlmodel import Session, select
from datetime import date, datetime
from database import engine
from models import Product, ProductBatch, UserArea, StockHistory, User, ProductCreateRequest, ProductRestockRequest, ProductUpdateRequest
from auth_and_users import get_current_user
import re
import pandas as pd

router = APIRouter(tags=["Inventory"])

def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def find_product_image(product_name: str) -> str | None:
    if not os.path.exists(PRODUCT_IMAGE_DIR):
        return None

    target = normalize(product_name)

    for file in os.listdir(PRODUCT_IMAGE_DIR):
        name_only = os.path.splitext(file)[0]
        if normalize(name_only) == target:
            return os.path.join(PRODUCT_IMAGE_DIR, file)

    return None


def get_product_by_identity(session: Session, name: str):
    name = normalize(name)

    products = session.exec(
        select(Product).where(
            Product.is_active == True,
            Product.name.ilike(f"%{name}%")
        )
    ).all()

    if not products:
        raise HTTPException(404, f"No product found for '{name}'")

    if len(products) > 1:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Multiple products found",
                "options": [
                    {
                        "id": p.id,
                        "name": p.name,
                        "category": p.category,
                        "rate": p.rate,
                    }
                    for p in products
                ]
            }
        )

    return products[0]

# ---------- PRODUCT ----------

# PRODUCTS (MAIN VAULT)
# ------------------------
@router.post("/products")
def add_product(
    product_data: ProductCreateRequest,
    current_user: User = Depends(get_current_user)
):
    with Session(engine) as session:
        # Check if product exists? (Optional, but good practice)
        
        product = Product(
            name=product_data.name,
            category=product_data.category,
            rate=product_data.rate,
            is_active=True
        )
        session.add(product)
        session.commit()
        session.refresh(product)

        # If initial quantity provided
        if product_data.quantity > 0:
            batch = ProductBatch(
                product_id=product.id,
                quantity=product_data.quantity,
                manufacturing_date=product_data.manufacturing_date,
                expiry_date=product_data.expiry_date,
                last_restocked_at=datetime.utcnow()
            )
            history = StockHistory(
                product_id=product.id,
                quantity=product_data.quantity,
                manufacturing_date=str(product_data.manufacturing_date) if product_data.manufacturing_date else None,
                expiry_date=str(product_data.expiry_date) if product_data.expiry_date else None,
                restocked_by=current_user.username,
                created_at=datetime.utcnow()
            )
            session.add(batch)
            session.add(history)
            session.commit()

        return product

from sqlalchemy import func

@router.get("/products")
def list_products():
    with Session(engine) as session:
        products = session.exec(
            select(Product).where(Product.is_active == True)
        ).all()

        results = []
        for p in products:
            # Calculate total quantity and find nearest expiry
            stock_data = session.exec(
                select(ProductBatch.quantity, ProductBatch.manufacturing_date, ProductBatch.expiry_date)
                .where(ProductBatch.product_id == p.id)
                .where(ProductBatch.quantity > 0)
                .order_by(ProductBatch.expiry_date.asc())
            ).all()

            total_qty = sum(item.quantity for item in stock_data)
            
            p_dict = p.dict()
            
            # Sanitize float values to avoid JSON errors
            if p_dict.get("rate") is not None and (math.isnan(p_dict["rate"]) or math.isinf(p_dict["rate"])):
                p_dict["rate"] = 0.0
                
            p_dict["quantity"] = total_qty if total_qty else 0
            
            # Add dates from the batch with the nearest expiry (first in list due to sorting)
            if stock_data:
                p_dict["manufacturing_date"] = stock_data[0].manufacturing_date
                p_dict["expiry_date"] = stock_data[0].expiry_date
            else:
                p_dict["manufacturing_date"] = None
                p_dict["expiry_date"] = None

            results.append(p_dict)
            
        return results

@router.put("/products/{product_id}")
def update_product(product_id: int, update_data: ProductUpdateRequest):
    with Session(engine) as session:
        product = session.get(Product, product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        product.name = update_data.name
        product.category = update_data.category
        product.rate = update_data.rate
        session.commit()

        return {"message": "Product updated successfully"}

@router.delete("/products")
def deactivate_product(name: str, category: str, rate: float):
    with Session(engine) as session:
        product = get_product_by_identity(session, name, category, rate)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        product.is_active = False
        session.commit()
        return {"message": "Product deactivated"}

# STOCK MANAGEMENT
# ------------------------
@router.post("/products/restock")
def restock_product(
    restock_data: ProductRestockRequest,
    current_user: User = Depends(get_current_user)
):
    if restock_data.expiry_date and restock_data.manufacturing_date and restock_data.expiry_date <= restock_data.manufacturing_date:
        raise HTTPException(
            status_code=400,
            detail="Expiry date must be after manufacturing date"
        )

    with Session(engine) as session:
        product = get_product_by_identity(session, restock_data.name, restock_data.category, restock_data.rate)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        batch = ProductBatch(
            product_id=product.id,
            quantity=restock_data.quantity,
            manufacturing_date=restock_data.manufacturing_date,
            expiry_date=restock_data.expiry_date,
            last_restocked_at=datetime.utcnow()
        )

        history = StockHistory(
            product_id=product.id,
            quantity=restock_data.quantity,
            manufacturing_date=str(restock_data.manufacturing_date) if restock_data.manufacturing_date else None,
            expiry_date=str(restock_data.expiry_date) if restock_data.expiry_date else None,
            restocked_by=current_user.username,
            created_at=datetime.utcnow()
        )

        session.add(batch)
        session.add(history)
        session.commit()
        return {"message": "Stock added successfully"}

@router.get("/products/stock-history")
def get_stock_history(name: str, category: str):

    with Session(engine) as session:

        product = session.exec(
            select(Product).where(
                Product.name == name,
                Product.category == category
            )
        ).first()

        if not product:
            raise HTTPException(404, "Product not found")

        records = session.exec(
            select(StockHistory)
            .where(StockHistory.product_id == product.id)
            .order_by(StockHistory.created_at.desc())
        ).all()

        return records

@router.get("/products/stock")
def get_product_stock(name: str, category: str, rate: float):
    with Session(engine) as session:
        product = get_product_by_identity(session, name, category, rate)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        return session.exec(
            select(ProductBatch).where(ProductBatch.product_id == product.id)
        ).all()

@router.get("/products/quantity")
def get_total_quantity(name: str, category: str, rate: float):
    with Session(engine) as session:
        product = get_product_by_identity(session, name, category, rate)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        batches = session.exec(
            select(ProductBatch).where(ProductBatch.product_id == product.id)
        ).all()

        total = sum(batch.quantity for batch in batches)
        return {
            "product": name,
            "total_quantity": total
        }

@router.get("/products/user-view")
def products_for_user(user_id: int):
    with Session(engine) as session:

        user_areas = session.exec(
            select(UserArea.category)
            .where(UserArea.user_id == user_id)
        ).all()
        return session.exec(
            select(Product)
            .where(
                Product.category.in_(user_areas),
                Product.is_active == True
            )
        ).all()

@router.get("/products/stock/user")
def get_user_main_stock(user_id: int):
    with Session(engine) as session:
        # 1️⃣ Get user areas
        user_areas = session.exec(
            select(UserArea.category)
            .where(UserArea.user_id == user_id)
        ).all()
        if not user_areas:
            return {"items": []}
        # 2️⃣ Get products in those areas
        products = session.exec(
            select(Product)
            .where(
                Product.category.in_(user_areas),
                Product.is_active == True
            )
        ).all()
        response = []
        for product in products:
            # 3️⃣ Calculate total stock
            batches = session.exec(
                select(ProductBatch.quantity)
                .where(ProductBatch.product_id == product.id)
            ).all()
            total_qty = sum(q for (q,) in batches)
            response.append({
                "name": product.name,
                "category": product.category,
                "rate": product.rate,
                "total_quantity": total_qty,
                "low_stock_alert": total_qty <= 5
            })
        return {
            "user_id": user_id,
            "items": response
        }
    
def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def get_product_by_identity(
    session: Session,
    name: str,
    category: str | None = None,
    rate: float | None = None
):
    name = normalize(name)

    query = select(Product).where(
        Product.is_active == True,
        Product.name.ilike(f"%{name}%")
    )

    if category:
        query = query.where(Product.category == category)

    if rate:
        query = query.where(Product.rate == rate)

    products = session.exec(query).all()

    if not products:
        raise HTTPException(
            status_code=404,
            detail=f"No product found for '{name}'"
        )

    if len(products) > 1:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Multiple products found",
                "options": [
                    {
                        "id": p.id,
                        "name": p.name,
                        "rate": p.rate,
                        "category": p.category
                    }
                    for p in products
                ]
            }
        )

    return products[0]

import os
import re

PRODUCT_IMAGE_DIR = "product_images"

def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())

def find_product_image(product_name: str) -> str | None:
    if not os.path.exists(PRODUCT_IMAGE_DIR):
        return None

    target = normalize(product_name)

    for file in os.listdir(PRODUCT_IMAGE_DIR):
        name_only = os.path.splitext(file)[0]
        if normalize(name_only) == target:
            return os.path.join(PRODUCT_IMAGE_DIR, file)

    return None

import shutil
import math
import pandas as pd
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

@router.post("/products/import-excel")
async def import_products_from_excel(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):

    print(f"DEBUG: Processing file: {file.filename}")
    if not file.filename.endswith(".xlsx"):
        print(f"DEBUG: Invalid extension: {file.filename}")
        raise HTTPException(400, "Only Excel files allowed")

    contents = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        print(f"DEBUG: Pandas read failed: {e}")
        # If it's a file format issue, pandas might raise ValueError/BadZipFile
        raise HTTPException(400, "Could not parse Excel file. Ensure valid format.")

    print(f"DEBUG: Columns found: {df.columns.tolist()}")

    # Normalize columns
    df.columns = df.columns.str.strip().str.lower()
    
    # Column mapping for flexibility
    rename_map = {
        "item name": "name",
        "item": "name",
        "product": "name",
        "categories": "category",
        "cat": "category",
        "price": "rate",
        "mrp": "rate",
        "cost": "rate"
    }
    df.rename(columns=rename_map, inplace=True)

    print(f"DEBUG: Normalized columns: {df.columns.tolist()}")

    required_cols = {
        "name",
        "category",
        "rate"
    }

    if not required_cols.issubset(df.columns):
        print(f"DEBUG: Missing columns. Expected {required_cols}, found {df.columns}")
        raise HTTPException(
            400,
            f"Excel must contain at least: {required_cols}"
        )


    # Sanitize data to prevent NaN/Inf errors
    if "rate" in df.columns:
        df["rate"] = df["rate"].fillna(0.0)
    
    if "quantity" in df.columns:
        df["quantity"] = df["quantity"].fillna(0)

    created_products = []
    restocked_products = []

    with Session(engine) as session:

        for _, row in df.iterrows():

            name = str(row["name"]).strip()
            category = str(row["category"]).strip()
            rate = float(row["rate"])
            
            # Optional fields with defaults
            quantity = 0
            if "quantity" in df.columns:
                try:
                    q = int(row["quantity"])
                    if not pd.isna(q):
                        quantity = q
                except:
                    quantity = 0

            mfg = None
            exp = None

            if "manufacturing_date" in df.columns and "expiry_date" in df.columns:
                try:
                    m = pd.to_datetime(row["manufacturing_date"]).date()
                    e = pd.to_datetime(row["expiry_date"]).date()
                    if not pd.isna(m) and not pd.isna(e) and e > m:
                        mfg = m
                        exp = e
                except:
                    pass

            product = session.exec(
                select(Product).where(
                    Product.name == name,
                    Product.category == category
                )
            ).first()

            # ✅ CREATE PRODUCT IF NOT EXISTS
            if not product:
                product = Product(
                    name=name,
                    category=category,
                    rate=rate,
                    is_active=True,
                    image_path=find_product_image(name)
                )
                session.add(product)
                session.commit()
                session.refresh(product)
                created_products.append(name)

            # ✅ ADD STOCK ONLY IF VALID QUANTITY
            if quantity > 0:
                batch = ProductBatch(
                    product_id=product.id,
                    quantity=quantity,
                    manufacturing_date=mfg,
                    expiry_date=exp,
                    last_restocked_at=datetime.utcnow()
                )

                history = StockHistory(
                    product_id=product.id,
                    quantity=quantity,
                    manufacturing_date=str(mfg) if mfg else None,
                    expiry_date=str(exp) if exp else None,
                    restocked_by=current_user.username
                )

                session.add(batch)
                session.add(history)
                restocked_products.append(name)
            
        session.commit()

    return {
        "created_products": created_products,
        "restocked_products": restocked_products,
        "total_rows_processed": len(df)
    }

@router.get("/products/export-excel")
def export_products_excel():
    with Session(engine) as session:
        data = []
        products = session.exec(select(Product)).all()
        for p in products:
            qty = session.exec(
                select(ProductBatch.quantity)
                .where(ProductBatch.product_id == p.id)
            ).all()
            total_qty = sum(qty)
            
            latest_history = session.exec(
                select(StockHistory)
                .where(StockHistory.product_id == p.id)
                .order_by(StockHistory.created_at.desc())
            ).first()
            
            restock_date = latest_history.created_at.strftime("%Y-%m-%d %H:%M:%S") if latest_history else "N/A"
            restock_qty = latest_history.quantity if latest_history else 0
            restocked_by = latest_history.restocked_by if latest_history else "N/A"
            
            data.append({
                "Name": p.name,
                "Category": p.category,
                "Rate": p.rate,
                "Total Quantity": total_qty,
                "Restock Date": restock_date,
                "Item Restock Quantity": restock_qty,
                "Restocked By": restocked_by,
                "Active": "Yes" if p.is_active else "No"
            })

    df = pd.DataFrame(data)

    # Write to BytesIO
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name="Products")
    
    output.seek(0)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"products_export_{timestamp}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

from PIL import Image
import imagehash
import traceback

# Dictionary to hold the pre-calculated phash of disk images
# Key format: absolute/relative path string
# Value format: imagehash.ImageHash object
_IMAGE_HASH_CACHE = {}

def get_image_hash(image_path: str):
    if image_path in _IMAGE_HASH_CACHE:
        return _IMAGE_HASH_CACHE[image_path]

    try:
        img = Image.open(image_path).convert("RGB")
        h = imagehash.phash(img)
        _IMAGE_HASH_CACHE[image_path] = h
        return h
    except Exception as e:
        print(f"Error hashing image {image_path}: {e}")
        raise e
def match_product_by_image(uploaded_image_path: str):
    uploaded_hash = get_image_hash(uploaded_image_path)

    best_match = None
    min_diff = 999

    with Session(engine) as session:
        products = session.exec(
            select(Product).where(Product.image_path != None)
        ).all()

        for product in products:
            try:
                db_hash = get_image_hash(product.image_path)
                diff = uploaded_hash - db_hash

                if diff < min_diff:
                    min_diff = diff
                    best_match = product
            except:
                continue

    if min_diff <= 10:  # threshold
        return best_match

    return None
@router.post("/products/scan-image")
def scan_product_image(file: UploadFile = File(...)):
    temp_path = f"temp_{file.filename}"

    with open(temp_path, "wb") as f:
        f.write(file.file.read())

    product = match_product_by_image(temp_path)

    os.remove(temp_path)

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not recognized"
        )

    return {
        "id": product.id,
        "name": product.name,
        "category": product.category,
        "rate": product.rate,
        "image": product.image_path
    }

import time
@router.post("/products/{product_id}/image")
def upload_product_image(product_id: int, file: UploadFile = File(...)):
    if not os.path.exists(PRODUCT_IMAGE_DIR):
        os.makedirs(PRODUCT_IMAGE_DIR)

    with Session(engine) as session:
        product = session.get(Product, product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
            
        ext = os.path.splitext(file.filename)[1]
        if not ext:
            ext = ".jpg"
            
        timestamp = int(time.time())
        safe_name = normalize(product.name).replace(" ", "_").replace("/", "_")
        filename = f"{safe_name}_{timestamp}{ext}"
        filepath = os.path.join(PRODUCT_IMAGE_DIR, filename)
        
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        product.image_path = filepath
        session.commit()
        
        # Invalidate cache if exists
        if filepath in _IMAGE_HASH_CACHE:
            del _IMAGE_HASH_CACHE[filepath]
            
        return {"message": "Image uploaded successfully", "image_path": filepath}

@router.get("/products/{product_id}/images")
def get_product_images(product_id: int):
    with Session(engine) as session:
        product = session.get(Product, product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
            
        if not os.path.exists(PRODUCT_IMAGE_DIR):
            return {"images": []}
            
        target = normalize(product.name)
        safe_target = target.replace(" ", "_").replace("/", "_")
        images = []
        for f in os.listdir(PRODUCT_IMAGE_DIR):
            name_only = os.path.splitext(f)[0]
            normalized_file = normalize(name_only)
            
            if normalized_file == target or normalized_file.startswith(target + "_") or normalized_file.startswith(safe_target + "_"):
                images.append(f"/product_images/{f}")
                
        # Sort images by modification time (newest first)
        try:
            images.sort(key=lambda x: os.path.getmtime(os.path.join(".", x.lstrip("/"))), reverse=True)
        except:
            pass
        return {"images": images}

@router.get("/products/all-images")
def get_all_product_images():
    if not os.path.exists(PRODUCT_IMAGE_DIR):
        return {"images": []}
    
    images = []
    for f in os.listdir(PRODUCT_IMAGE_DIR):
        if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif')):
            images.append({
                "url": f"/product_images/{f}",
                "name": f
            })
            
    try:
        images.sort(key=lambda x: os.path.getmtime(os.path.join(".", x["url"].lstrip("/"))), reverse=True)
    except:
        pass
        
    return {"images": images}
