from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import hmac
import hashlib
import random
import logging
import bcrypt
import jwt
import httpx
import razorpay
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

try:
    from twilio.rest import Client as TwilioClient
except Exception:
    TwilioClient = None


# ----- DB -----
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ----- App -----
app = FastAPI(title="Rythu Shubham API")
api = APIRouter(prefix="/api")

# ----- Razorpay -----
razorpay_client = razorpay.Client(
    auth=(os.environ.get("RAZORPAY_KEY_ID", ""), os.environ.get("RAZORPAY_KEY_SECRET", ""))
)


# ----- Twilio (lazy init) -----
def get_twilio():
    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    token = os.environ.get("TWILIO_AUTH_TOKEN")
    if not sid or not token or TwilioClient is None:
        return None
    return TwilioClient(sid, token)


# ----- Shiprocket Auth (in-memory cached token) -----
_SR_TOKEN = {"value": None, "expires": None}
SR_BASE = "https://apiv2.shiprocket.in/v1/external"


async def shiprocket_token() -> str:
    now = datetime.now(timezone.utc)
    if _SR_TOKEN["value"] and _SR_TOKEN["expires"] and now < _SR_TOKEN["expires"]:
        return _SR_TOKEN["value"]
    email = os.environ.get("SHIPROCKET_EMAIL")
    password = os.environ.get("SHIPROCKET_PASSWORD")
    if not email or not password:
        raise HTTPException(status_code=500, detail="Shiprocket credentials not configured")
    async with httpx.AsyncClient(timeout=20) as cli:
        r = await cli.post(f"{SR_BASE}/auth/login", json={"email": email, "password": password})
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Shiprocket auth failed: {r.text[:200]}")
        data = r.json()
        _SR_TOKEN["value"] = data["token"]
        _SR_TOKEN["expires"] = now + timedelta(days=9)
        return data["token"]

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7


# ----- Models -----
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    role: str
    created_at: str


class AuthResponse(BaseModel):
    user: UserOut
    token: str


class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    category: str
    price: float
    mrp: Optional[float] = None
    unit: str = "per unit"
    description: str
    image: str
    stock: int = 100
    rating: float = 4.5
    featured: bool = False
    brand: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ProductCreate(BaseModel):
    name: str
    category: str
    price: float
    mrp: Optional[float] = None
    unit: str = "per unit"
    description: str
    image: str
    stock: int = 100
    brand: Optional[str] = None
    featured: bool = False


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    mrp: Optional[float] = None
    unit: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    stock: Optional[int] = None
    brand: Optional[str] = None
    featured: Optional[bool] = None


class CartItemIn(BaseModel):
    product_id: str
    quantity: int = Field(ge=1)


class CartItem(BaseModel):
    product_id: str
    quantity: int


class Address(BaseModel):
    full_name: str
    phone: str
    line1: str
    line2: Optional[str] = ""
    city: str
    state: str
    pincode: str


class OrderCreate(BaseModel):
    address: Address
    payment_method: Literal["COD", "ONLINE"] = "COD"
    notes: Optional[str] = ""


class OrderItem(BaseModel):
    product_id: str
    name: str
    image: str
    price: float
    quantity: int


class Order(BaseModel):
    id: str
    user_id: str
    user_email: str
    items: List[OrderItem]
    subtotal: float
    shipping: float
    total: float
    address: Address
    payment_method: str
    payment_status: str
    status: str
    notes: str = ""
    created_at: str


class OrderStatusUpdate(BaseModel):
    status: Literal["pending", "confirmed", "shipped", "delivered", "cancelled"]


# ----- Utils -----
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS),
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


def user_doc_to_out(doc: dict) -> UserOut:
    return UserOut(
        id=doc["id"],
        email=doc["email"],
        name=doc["name"],
        phone=doc.get("phone"),
        role=doc.get("role", "customer"),
        created_at=doc["created_at"],
    )


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth[7:]
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ----- Auth Routes -----
@api.post("/auth/register", response_model=AuthResponse)
async def register(payload: UserCreate):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": email,
        "name": payload.name,
        "phone": payload.phone,
        "password_hash": hash_password(payload.password),
        "role": "customer",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_token(user_id, email, "customer")
    return AuthResponse(user=user_doc_to_out(doc), token=token)


@api.post("/auth/login", response_model=AuthResponse)
async def login(payload: UserLogin):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], email, user.get("role", "customer"))
    return AuthResponse(user=user_doc_to_out(user), token=token)


@api.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return user_doc_to_out(user)


# ----- Categories -----
CATEGORIES = [
    {"slug": "seeds", "name": "Seeds", "image": "https://images.unsplash.com/photo-1693307297659-61e4ee3de0ba?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwxfHxhZ3JpY3VsdHVyZSUyMHNlZWRzJTIwZmFybWluZ3xlbnwwfHx8fDE3NzgxNjgyNTJ8MA&ixlib=rb-4.1.0&q=85"},
    {"slug": "sprayers", "name": "Sprayers", "image": "https://static.prod-images.emergentagent.com/jobs/228099b1-d69e-446a-bd0c-79e5ab5a1a28/images/5ea2c1fc4f82ea695857f5edc10fec3ebaff859f11b3490c573a1cc7bf4a8634.png"},
    {"slug": "machinery", "name": "Machinery", "image": "https://images.unsplash.com/photo-1763416160482-c77fadd32d3f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjd8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjBhZ3JpY3VsdHVyZSUyMHRyYWN0b3IlMjBmYXJtaW5nfGVufDB8fHx8MTc3ODE2ODI1Mnww&ixlib=rb-4.1.0&q=85"},
    {"slug": "tools", "name": "Tools", "image": "https://images.unsplash.com/photo-1705113998946-1eefc7961c24?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTV8MHwxfHNlYXJjaHwzfHxmYXJtaW5nJTIwdG9vbHMlMjBzaG92ZWx8ZW58MHx8fHwxNzc4MTY4MjUyfDA&ixlib=rb-4.1.0&q=85"},
    {"slug": "fertilizers", "name": "Fertilizers", "image": "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80"},
]


@api.get("/categories")
async def list_categories():
    return CATEGORIES


# ----- Product Routes -----
def slugify(s: str) -> str:
    return "-".join(s.lower().split())


@api.get("/products", response_model=List[Product])
async def list_products(
    category: Optional[str] = None,
    q: Optional[str] = None,
    featured: Optional[bool] = None,
    limit: int = Query(60, le=200),
):
    query = {}
    if category:
        query["category"] = category
    if featured is not None:
        query["featured"] = featured
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    items = await db.products.find(query, {"_id": 0}).to_list(limit)
    return items


@api.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    p = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return p


@api.post("/products", response_model=Product)
async def create_product(payload: ProductCreate, _: dict = Depends(require_admin)):
    p = Product(
        slug=slugify(payload.name),
        **payload.model_dump(),
    )
    doc = p.model_dump()
    await db.products.insert_one(doc)
    return p


@api.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, payload: ProductUpdate, _: dict = Depends(require_admin)):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "name" in updates:
        updates["slug"] = slugify(updates["name"])
    if updates:
        await db.products.update_one({"id": product_id}, {"$set": updates})
    p = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return p


@api.delete("/products/{product_id}")
async def delete_product(product_id: str, _: dict = Depends(require_admin)):
    res = await db.products.delete_one({"id": product_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}


# ----- Cart Routes -----
@api.get("/cart")
async def get_cart(user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]}, {"_id": 0})
    items = cart["items"] if cart else []
    if not items:
        return {"items": [], "subtotal": 0.0}
    pids = [it["product_id"] for it in items]
    products = await db.products.find({"id": {"$in": pids}}, {"_id": 0}).to_list(len(pids))
    pmap = {p["id"]: p for p in products}
    detailed = []
    subtotal = 0.0
    for it in items:
        p = pmap.get(it["product_id"])
        if not p:
            continue
        line = p["price"] * it["quantity"]
        subtotal += line
        detailed.append({
            "product_id": p["id"],
            "name": p["name"],
            "image": p["image"],
            "price": p["price"],
            "unit": p["unit"],
            "quantity": it["quantity"],
            "line_total": line,
        })
    return {"items": detailed, "subtotal": round(subtotal, 2)}


@api.post("/cart/items")
async def add_to_cart(item: CartItemIn, user: dict = Depends(get_current_user)):
    p = await db.products.find_one({"id": item.product_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart:
        await db.carts.insert_one({"user_id": user["id"], "items": [item.model_dump()]})
    else:
        items = cart.get("items", [])
        found = False
        for i in items:
            if i["product_id"] == item.product_id:
                i["quantity"] += item.quantity
                found = True
                break
        if not found:
            items.append(item.model_dump())
        await db.carts.update_one({"user_id": user["id"]}, {"$set": {"items": items}})
    return {"ok": True}


@api.put("/cart/items/{product_id}")
async def update_cart_item(product_id: str, item: CartItemIn, user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart empty")
    items = cart.get("items", [])
    for i in items:
        if i["product_id"] == product_id:
            i["quantity"] = item.quantity
            break
    await db.carts.update_one({"user_id": user["id"]}, {"$set": {"items": items}})
    return {"ok": True}


@api.delete("/cart/items/{product_id}")
async def remove_cart_item(product_id: str, user: dict = Depends(get_current_user)):
    await db.carts.update_one(
        {"user_id": user["id"]},
        {"$pull": {"items": {"product_id": product_id}}},
    )
    return {"ok": True}


@api.delete("/cart")
async def clear_cart(user: dict = Depends(get_current_user)):
    await db.carts.update_one({"user_id": user["id"]}, {"$set": {"items": []}}, upsert=True)
    return {"ok": True}


# ----- Order Routes -----
SHIPPING_THRESHOLD = 1000
SHIPPING_FEE = 49


@api.post("/orders")
async def create_order(payload: OrderCreate, user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    cart_items = cart["items"]
    pids = [it["product_id"] for it in cart_items]
    products = await db.products.find({"id": {"$in": pids}}, {"_id": 0}).to_list(len(pids))
    pmap = {p["id"]: p for p in products}
    items = []
    subtotal = 0.0
    for it in cart_items:
        p = pmap.get(it["product_id"])
        if not p:
            continue
        line = p["price"] * it["quantity"]
        subtotal += line
        items.append({
            "product_id": p["id"],
            "name": p["name"],
            "image": p["image"],
            "price": p["price"],
            "quantity": it["quantity"],
        })
    shipping = 0 if subtotal >= SHIPPING_THRESHOLD else SHIPPING_FEE
    total = subtotal + shipping
    order_id = str(uuid.uuid4())
    order_doc = {
        "id": order_id,
        "user_id": user["id"],
        "user_email": user["email"],
        "items": items,
        "subtotal": round(subtotal, 2),
        "shipping": shipping,
        "total": round(total, 2),
        "address": payload.address.model_dump(),
        "payment_method": payload.payment_method,
        "payment_status": "pending",
        "status": "pending",
        "notes": payload.notes or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(order_doc)
    await db.carts.update_one({"user_id": user["id"]}, {"$set": {"items": []}})
    order_doc.pop("_id", None)
    return order_doc


@api.get("/orders")
async def list_my_orders(user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return orders


@api.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    if o["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return o


@api.get("/admin/orders")
async def admin_list_orders(_: dict = Depends(require_admin)):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders


@api.patch("/admin/orders/{order_id}")
async def admin_update_order(order_id: str, payload: OrderStatusUpdate, _: dict = Depends(require_admin)):
    res = await db.orders.update_one({"id": order_id}, {"$set": {"status": payload.status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"ok": True}


class PayVerifyIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@api.post("/orders/{order_id}/payment/create-razorpay")
async def create_razorpay_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if order.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Order already paid")
    amount_paise = int(round(order["total"] * 100))
    rp_order = razorpay_client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": order_id[:40],
        "payment_capture": 1,
        "notes": {"internal_order_id": order_id, "user_email": user["email"]},
    })
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"razorpay_order_id": rp_order["id"]}},
    )
    return {
        "razorpay_order_id": rp_order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "key_id": os.environ["RAZORPAY_KEY_ID"],
        "order_id": order_id,
        "prefill": {
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "contact": user.get("phone") or order["address"].get("phone", ""),
        },
    }


@api.post("/orders/{order_id}/payment/verify")
async def verify_razorpay_payment(order_id: str, payload: PayVerifyIn, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    secret = os.environ["RAZORPAY_KEY_SECRET"].encode()
    body = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode()
    expected = hmac.new(secret, body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, payload.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "payment_status": "paid",
            "razorpay_payment_id": payload.razorpay_payment_id,
            "razorpay_signature": payload.razorpay_signature,
        }},
    )
    return {"ok": True, "order_id": order_id, "payment_status": "paid"}


@api.get("/admin/stats")
async def admin_stats(_: dict = Depends(require_admin)):
    total_orders = await db.orders.count_documents({})
    pending = await db.orders.count_documents({"status": "pending"})
    products = await db.products.count_documents({})
    customers = await db.users.count_documents({"role": "customer"})
    pipeline = [{"$group": {"_id": None, "rev": {"$sum": "$total"}}}]
    rev_doc = await db.orders.aggregate(pipeline).to_list(1)
    revenue = rev_doc[0]["rev"] if rev_doc else 0
    return {
        "total_orders": total_orders,
        "pending_orders": pending,
        "total_products": products,
        "total_customers": customers,
        "revenue": round(revenue, 2),
    }


# ----- Health -----
@api.get("/")
async def root():
    return {"message": "Rythu Shubham API running", "version": "2.0"}


# ----- Site / Business Config -----
@api.get("/site-config")
async def site_config():
    return {
        "brand": "Rythu Shubham",
        "tagline_en": "Best solutions for farmers",
        "tagline_te": "రైతుల కోసం ఉత్తమ పరిష్కారాలు",
        "logo_url": "https://customer-assets.emergentagent.com/job_harvest-commerce-11/artifacts/bxmnrpko_EDFC146D-03D8-4C47-9335-66933D3D31B3.png",
        "msg91": {
            "widget_id": os.environ.get("MSG91_WIDGET_ID", ""),
            "token_auth": os.environ.get("MSG91_TOKEN_AUTH", ""),
        },
        "business": {
            "name": os.environ.get("BUSINESS_NAME", ""),
            "address": os.environ.get("BUSINESS_ADDRESS", ""),
            "phone": os.environ.get("BUSINESS_PHONE", ""),
            "email": os.environ.get("BUSINESS_EMAIL", ""),
            "gstin": os.environ.get("BUSINESS_GSTIN", ""),
        },
        "policies": {
            "refund": "Non-returnable. All sales are final once dispatched.",
            "shipping": "Pan-India shipping. Free delivery on orders above ₹1000.",
        },
    }


# ----- Phone OTP (Twilio) -----
class OtpSendIn(BaseModel):
    phone: str = Field(min_length=10)


class OtpVerifyIn(BaseModel):
    phone: str
    code: str
    name: Optional[str] = None


def normalise_phone(p: str) -> str:
    p = p.strip().replace(" ", "").replace("-", "")
    if not p.startswith("+"):
        # default to India country code if 10 digits
        digits = "".join(c for c in p if c.isdigit())
        if len(digits) == 10:
            p = "+91" + digits
        else:
            p = "+" + digits
    return p


@api.post("/auth/otp/send")
async def otp_send(payload: OtpSendIn):
    phone = normalise_phone(payload.phone)
    code = f"{random.randint(100000, 999999)}"
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    await db.otp_codes.update_one(
        {"phone": phone},
        {"$set": {"code": code, "expires_at": expires.isoformat(), "attempts": 0}},
        upsert=True,
    )
    twilio = get_twilio()
    sent_via = "console"
    if twilio:
        try:
            sender = os.environ.get("TWILIO_FROM_NUMBER")
            if sender:
                twilio.messages.create(
                    body=f"Your Rythu Shubham OTP is {code}. Valid 10 min.",
                    from_=sender,
                    to=phone,
                )
                sent_via = "sms"
            else:
                # No sender configured — fall back to console for dev
                logger.info(f"[DEV-OTP] {phone} -> {code}")
                sent_via = "console (no TWILIO_FROM_NUMBER)"
        except Exception as e:
            logger.error(f"Twilio send failed: {e}")
            logger.info(f"[DEV-OTP] {phone} -> {code}")
            sent_via = f"console (twilio error: {str(e)[:80]})"
    else:
        logger.info(f"[DEV-OTP] {phone} -> {code}")
    return {"ok": True, "sent_via": sent_via}


@api.post("/auth/otp/verify", response_model=AuthResponse)
async def otp_verify(payload: OtpVerifyIn):
    phone = normalise_phone(payload.phone)
    rec = await db.otp_codes.find_one({"phone": phone}, {"_id": 0})
    if not rec:
        raise HTTPException(status_code=400, detail="No OTP found, please request again")
    if datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")
    if rec.get("attempts", 0) >= 5:
        raise HTTPException(status_code=429, detail="Too many attempts")
    if rec["code"] != payload.code.strip():
        await db.otp_codes.update_one({"phone": phone}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Invalid OTP")
    await db.otp_codes.delete_one({"phone": phone})

    user = await db.users.find_one({"phone": phone}, {"_id": 0})
    if not user:
        # auto-create
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": f"phone_{user_id[:8]}@phone.local",
            "name": payload.name or f"Customer {phone[-4:]}",
            "phone": phone,
            "password_hash": hash_password(uuid.uuid4().hex),
            "role": "customer",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user)
    token = create_token(user["id"], user["email"], user.get("role", "customer"))
    return AuthResponse(user=user_doc_to_out(user), token=token)


class Msg91VerifyIn(BaseModel):
    access_token: str
    phone: Optional[str] = None
    name: Optional[str] = None


@api.post("/auth/msg91/verify", response_model=AuthResponse)
async def msg91_verify(payload: Msg91VerifyIn):
    """Verify MSG91 widget access-token server-side, then issue our JWT."""
    auth_key = os.environ.get("MSG91_AUTH_KEY")
    if not auth_key:
        raise HTTPException(status_code=500, detail="MSG91 not configured")
    async with httpx.AsyncClient(timeout=20) as cli:
        r = await cli.post(
            "https://control.msg91.com/api/v5/widget/verifyAccessToken",
            json={"authkey": auth_key, "access-token": payload.access_token},
            headers={"Content-Type": "application/json"},
        )
    try:
        data = r.json()
    except Exception:
        raise HTTPException(status_code=502, detail=f"MSG91 invalid response: {r.text[:200]}")
    type_ok = str(data.get("type", "")).lower() == "success"
    if r.status_code != 200 or not type_ok:
        raise HTTPException(status_code=400, detail=f"MSG91 verify failed: {str(data)[:200]}")

    msg = data.get("message") if isinstance(data.get("message"), dict) else {}
    verified_phone = (
        data.get("phone")
        or data.get("mobile")
        or msg.get("mobile")
        or msg.get("phone")
        or payload.phone
    )
    if not verified_phone:
        raise HTTPException(status_code=400, detail="No phone returned from MSG91; pass phone in payload")
    phone = normalise_phone(str(verified_phone))

    user = await db.users.find_one({"phone": phone}, {"_id": 0})
    if not user:
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": f"phone_{user_id[:8]}@phone.local",
            "name": payload.name or f"Customer {phone[-4:]}",
            "phone": phone,
            "password_hash": hash_password(uuid.uuid4().hex),
            "role": "customer",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user)
    token = create_token(user["id"], user["email"], user.get("role", "customer"))
    return AuthResponse(user=user_doc_to_out(user), token=token)



# ----- Shiprocket: Ship an order -----
@api.post("/admin/orders/{order_id}/ship")
async def ship_order(order_id: str, _: dict = Depends(require_admin)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("awb_code"):
        return {"ok": True, "awb_code": order["awb_code"], "courier_name": order.get("courier_name"), "tracking_url": order.get("tracking_url"), "message": "Already shipped"}

    token = await shiprocket_token()
    addr = order["address"]
    items = []
    total_weight = 0.5
    for it in order["items"]:
        items.append({
            "name": it["name"][:80],
            "sku": it["product_id"][:30],
            "units": it["quantity"],
            "selling_price": it["price"],
        })
        total_weight += 0.3 * it["quantity"]

    pickup = os.environ.get("SHIPROCKET_PICKUP_LOCATION", "Primary")
    payload = {
        "order_id": order_id[:30],
        "order_date": order["created_at"][:10],
        "pickup_location": pickup,
        "billing_customer_name": addr["full_name"].split(" ")[0] or addr["full_name"],
        "billing_last_name": " ".join(addr["full_name"].split(" ")[1:]) or "-",
        "billing_address": addr["line1"],
        "billing_address_2": addr.get("line2", "") or "",
        "billing_city": addr["city"],
        "billing_pincode": addr["pincode"],
        "billing_state": addr["state"],
        "billing_country": "India",
        "billing_email": order.get("user_email", os.environ.get("BUSINESS_EMAIL", "")),
        "billing_phone": addr["phone"],
        "shipping_is_billing": True,
        "order_items": items,
        "payment_method": "COD" if order["payment_method"] == "COD" else "Prepaid",
        "sub_total": order["subtotal"],
        "length": 15, "breadth": 15, "height": 10, "weight": round(total_weight, 2),
    }

    async with httpx.AsyncClient(timeout=30) as cli:
        r = await cli.post(
            f"{SR_BASE}/orders/create/adhoc",
            headers={"Authorization": f"Bearer {token}"},
            json=payload,
        )
        if r.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail=f"Shiprocket order failed: {r.text[:300]}")
        data = r.json()
        shipment_id = data.get("shipment_id")
        if not shipment_id:
            raise HTTPException(status_code=502, detail=f"No shipment_id from Shiprocket: {str(data)[:200]}")

        # Auto-assign AWB
        awb_resp = await cli.post(
            f"{SR_BASE}/courier/assign/awb",
            headers={"Authorization": f"Bearer {token}"},
            json={"shipment_id": shipment_id},
        )
        awb_data = {}
        if awb_resp.status_code == 200:
            awb_data = awb_resp.json().get("response", {}).get("data", {}) or awb_resp.json()

    awb_code = awb_data.get("awb_code") or awb_data.get("awb")
    courier_name = awb_data.get("courier_name", "")
    tracking_url = f"https://shiprocket.co/tracking/{awb_code}" if awb_code else ""

    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "shiprocket_shipment_id": shipment_id,
            "shiprocket_order_id": data.get("order_id"),
            "awb_code": awb_code,
            "courier_name": courier_name,
            "tracking_url": tracking_url,
            "status": "shipped" if awb_code else "confirmed",
        }},
    )

    # Notify customer via MSG91 SMS (best-effort; only if MSG91_TEMPLATE_ID set)
    if awb_code:
        try:
            await msg91_send_ship_sms(
                phone=order["address"].get("phone", ""),
                customer_name=order["address"].get("full_name", "Customer"),
                order_short=order_id[:8].upper(),
                awb_code=awb_code,
                tracking_url=tracking_url,
            )
        except Exception as e:
            logger.warning(f"MSG91 SMS notify failed (non-fatal): {e}")

    return {
        "ok": True,
        "shipment_id": shipment_id,
        "awb_code": awb_code,
        "courier_name": courier_name,
        "tracking_url": tracking_url,
        "raw": awb_data if not awb_code else None,
    }


async def msg91_send_ship_sms(phone: str, customer_name: str, order_short: str, awb_code: str, tracking_url: str):
    """Send shipment-notification SMS via MSG91 Flow API.
    Requires MSG91_TEMPLATE_ID (DLT-approved). Logs to console if not set."""
    template_id = os.environ.get("MSG91_TEMPLATE_ID")
    auth_key = os.environ.get("MSG91_AUTH_KEY")
    body = f"Dear {customer_name}, your Rythu Shubham order {order_short} has shipped. AWB {awb_code}. Track: {tracking_url} - Sri Laxmi Ganesh Seeds & Sprayers"
    if not template_id or not auth_key:
        logger.info(f"[SMS-SKIP no MSG91_TEMPLATE_ID] would send to {phone}: {body}")
        return
    if not phone:
        return
    p = phone.replace("+", "").replace(" ", "")
    if len(p) == 10:
        p = "91" + p
    async with httpx.AsyncClient(timeout=15) as cli:
        r = await cli.post(
            "https://control.msg91.com/api/v5/flow/",
            headers={"Content-Type": "application/json", "authkey": auth_key},
            json={
                "template_id": template_id,
                "short_url": "1",
                "recipients": [{
                    "mobiles": p,
                    "name": customer_name,
                    "order_id": order_short,
                    "awb": awb_code,
                    "tracking_url": tracking_url,
                }],
            },
        )
        logger.info(f"MSG91 flow SMS to {p}: {r.status_code} {r.text[:200]}")


@api.get("/orders/{order_id}/tracking")
async def order_tracking(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    awb = order.get("awb_code")
    if not awb:
        return {"awb_code": None, "status": order.get("status", "pending"), "events": [], "tracking_url": None}
    token = await shiprocket_token()
    async with httpx.AsyncClient(timeout=15) as cli:
        r = await cli.get(f"{SR_BASE}/courier/track/awb/{awb}", headers={"Authorization": f"Bearer {token}"})
        if r.status_code != 200:
            return {"awb_code": awb, "status": order.get("status"), "events": [], "tracking_url": order.get("tracking_url"), "error": r.text[:200]}
        data = r.json()
    return {
        "awb_code": awb,
        "courier_name": order.get("courier_name"),
        "tracking_url": order.get("tracking_url"),
        "status": order.get("status"),
        "raw": data,
    }


# ----- Seed -----
SAMPLE_PRODUCTS = [
    # Seeds
    {"name": "Hybrid Tomato Seeds (50g)", "category": "seeds", "price": 249, "mrp": 320, "unit": "per pack", "stock": 200, "brand": "GreenGrow", "featured": True,
     "description": "High-yield hybrid tomato seeds with strong disease resistance. Suitable for both open field and polyhouse cultivation.",
     "image": "https://images.unsplash.com/photo-1693307297659-61e4ee3de0ba?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwxfHxhZ3JpY3VsdHVyZSUyMHNlZWRzJTIwZmFybWluZ3xlbnwwfHx8fDE3NzgxNjgyNTJ8MA&ixlib=rb-4.1.0&q=85"},
    {"name": "Premium Wheat Seeds (5kg)", "category": "seeds", "price": 599, "mrp": 750, "unit": "per bag", "stock": 150, "brand": "BharatSeeds", "featured": False,
     "description": "Certified high-yielding variety wheat seeds. Drought tolerant and rust resistant.",
     "image": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&q=80"},
    {"name": "Organic Corn Seeds (1kg)", "category": "seeds", "price": 349, "mrp": 450, "unit": "per pack", "stock": 180, "brand": "OrganicHarvest", "featured": True,
     "description": "100% organic non-GMO sweet corn seeds. Perfect germination rate.",
     "image": "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=800&q=80"},
    {"name": "Cotton Hybrid Seeds (450g)", "category": "seeds", "price": 899, "unit": "per pack", "stock": 90, "brand": "Mahyco",
     "description": "BT cotton hybrid seeds with bollworm resistance. High lint output variety.",
     "image": "https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?w=800&q=80"},
    # Sprayers
    {"name": "Battery Knapsack Sprayer 16L", "category": "sprayers", "price": 3499, "mrp": 4500, "unit": "per piece", "stock": 60, "brand": "AgriPro", "featured": True,
     "description": "Powerful 12V rechargeable battery sprayer with 16L tank capacity. Adjustable nozzles included.",
     "image": "https://static.prod-images.emergentagent.com/jobs/228099b1-d69e-446a-bd0c-79e5ab5a1a28/images/5ea2c1fc4f82ea695857f5edc10fec3ebaff859f11b3490c573a1cc7bf4a8634.png"},
    {"name": "Manual Hand Sprayer 8L", "category": "sprayers", "price": 1199, "mrp": 1500, "unit": "per piece", "stock": 100, "brand": "Neptune",
     "description": "Compact manual lever sprayer ideal for small farms and gardens. Brass nozzle for durability.",
     "image": "https://images.unsplash.com/photo-1599723571814-0e84a47f7a93?w=800&q=80"},
    {"name": "Petrol Engine Power Sprayer", "category": "sprayers", "price": 12499, "mrp": 15000, "unit": "per piece", "stock": 25, "brand": "Honda",
     "description": "Heavy duty 4-stroke petrol engine sprayer. High pressure for orchards and large fields.",
     "image": "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80"},
    # Machinery
    {"name": "Mini Power Tiller 7HP", "category": "machinery", "price": 64999, "mrp": 78000, "unit": "per piece", "stock": 12, "brand": "VST", "featured": True,
     "description": "7HP diesel mini tiller with multi-speed gearbox. Ideal for small to medium plots.",
     "image": "https://images.unsplash.com/photo-1763416160482-c77fadd32d3f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjd8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjBhZ3JpY3VsdHVyZSUyMHRyYWN0b3IlMjBmYXJtaW5nfGVufDB8fHx8MTc3ODE2ODI1Mnww&ixlib=rb-4.1.0&q=85"},
    {"name": "Brush Cutter 2-Stroke", "category": "machinery", "price": 8499, "mrp": 11000, "unit": "per piece", "stock": 40, "brand": "Stihl",
     "description": "2-stroke 52cc brush cutter with backpack harness. Includes nylon and metal blades.",
     "image": "https://images.unsplash.com/photo-1592978200070-a36979ca58a3?w=800&q=80"},
    {"name": "Rotavator 5 Feet", "category": "machinery", "price": 89999, "unit": "per piece", "stock": 8, "brand": "Shaktiman",
     "description": "5 feet heavy-duty rotavator with 42 blades. PTO driven, suitable for 35-50HP tractors.",
     "image": "https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=800&q=80"},
    # Tools
    {"name": "Steel Garden Spade", "category": "tools", "price": 449, "mrp": 599, "unit": "per piece", "stock": 250, "brand": "Falcon", "featured": True,
     "description": "Forged carbon steel garden spade with hardwood handle. Rust resistant powder coating.",
     "image": "https://images.unsplash.com/photo-1705113998946-1eefc7961c24?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTV8MHwxfHNlYXJjaHwzfHxmYXJtaW5nJTIwdG9vbHMlMjBzaG92ZWx8ZW58MHx8fHwxNzc4MTY4MjUyfDA&ixlib=rb-4.1.0&q=85"},
    {"name": "Hand Pruner / Secateur", "category": "tools", "price": 299, "mrp": 450, "unit": "per piece", "stock": 320, "brand": "Wolf",
     "description": "Bypass pruning shear with high carbon steel blade. Comfortable ergonomic grip.",
     "image": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80"},
    {"name": "Pickaxe with Wooden Handle", "category": "tools", "price": 549, "unit": "per piece", "stock": 140, "brand": "Falcon",
     "description": "Traditional pickaxe with seasoned wooden handle. Perfect for digging and breaking hard soil.",
     "image": "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80"},
    {"name": "Sickle Set (Pack of 3)", "category": "tools", "price": 379, "unit": "per set", "stock": 200, "brand": "Krishi",
     "description": "Set of 3 sharp serrated sickles for harvesting paddy, wheat and grass.",
     "image": "https://images.unsplash.com/photo-1592924357229-ade3a87bb2e7?w=800&q=80"},
    # Fertilizers
    {"name": "Organic Vermicompost (10kg)", "category": "fertilizers", "price": 399, "mrp": 500, "unit": "per bag", "stock": 220, "brand": "EarthGold", "featured": True,
     "description": "100% natural vermicompost rich in nutrients. Improves soil structure and water retention.",
     "image": "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80"},
    {"name": "NPK 19:19:19 (5kg)", "category": "fertilizers", "price": 549, "mrp": 700, "unit": "per pack", "stock": 180, "brand": "IFFCO",
     "description": "Balanced water-soluble NPK fertilizer. Suitable for foliar and drip application.",
     "image": "https://images.unsplash.com/photo-1592978200070-a36979ca58a3?w=800&q=80"},
    {"name": "Neem Cake Powder (5kg)", "category": "fertilizers", "price": 299, "unit": "per bag", "stock": 200, "brand": "Neemix",
     "description": "Pure neem cake organic fertilizer and pest deterrent. Cold-pressed quality.",
     "image": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80"},
]


async def seed_admin():
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Rythu Shubham Admin",
            "phone": None,
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    else:
        # ensure password matches .env
        if not verify_password(admin_password, existing["password_hash"]):
            await db.users.update_one(
                {"email": admin_email},
                {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}},
            )


async def seed_products():
    count = await db.products.count_documents({})
    if count > 0:
        return
    docs = []
    for p in SAMPLE_PRODUCTS:
        prod = Product(slug=slugify(p["name"]), **p)
        docs.append(prod.model_dump())
    if docs:
        await db.products.insert_many(docs)


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.products.create_index("category")
    await db.orders.create_index("user_id")
    await seed_admin()
    await seed_products()


# ----- Mount -----
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
