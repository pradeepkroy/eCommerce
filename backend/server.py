from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'ecommerce_db')]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7

# Create the main app
app = FastAPI(title="Multi-Business E-Commerce API", version="2.0.0")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== ENUMS ====================
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    BUSINESS_ADMIN = "business_admin"
    STAFF = "staff"
    CUSTOMER = "customer"

class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

class PaymentMethod(str, Enum):
    STRIPE = "stripe"
    PAYPAL = "paypal"
    RAZORPAY = "razorpay"

class DropshipStatus(str, Enum):
    PENDING = "pending"
    SENT_TO_SUPPLIER = "sent_to_supplier"
    SUPPLIER_CONFIRMED = "supplier_confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"

# ==================== MODELS ====================

# Business/Tenant Model
class BusinessCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: str = "#00ACAC"
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None

class Business(BusinessCreate):
    business_id: str = Field(default_factory=lambda: f"biz_{uuid.uuid4().hex[:12]}")
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    settings: Dict[str, Any] = {}

# Platform Settings (Super Admin)
class PlatformSettings(BaseModel):
    platform_name: str = "ShopStore Platform"
    platform_logo_url: Optional[str] = None
    show_powered_by: bool = True
    default_currency: str = "AUD"
    stripe_enabled: bool = True
    paypal_enabled: bool = False
    razorpay_enabled: bool = False
    sendgrid_api_key: Optional[str] = None
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None

# User Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None
    role: UserRole = UserRole.CUSTOMER
    business_id: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    picture: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class PasswordReset(BaseModel):
    email: EmailStr

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    phone: Optional[str] = None
    role: str
    business_id: Optional[str] = None
    picture: Optional[str] = None
    is_active: bool
    created_at: str

# Category Models
class CategoryCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    parent_id: Optional[str] = None
    is_active: bool = True

class Category(CategoryCreate):
    category_id: str = Field(default_factory=lambda: f"cat_{uuid.uuid4().hex[:12]}")
    business_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Product Models
class ProductImage(BaseModel):
    url: str
    alt: Optional[str] = None
    is_primary: bool = False

class ProductVariant(BaseModel):
    variant_id: str = Field(default_factory=lambda: f"var_{uuid.uuid4().hex[:8]}")
    name: str
    sku: Optional[str] = None
    price: float
    compare_at_price: Optional[float] = None
    stock: int = 0
    attributes: Dict[str, str] = {}

class ProductCreate(BaseModel):
    name: str
    slug: str
    short_description: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    price: float
    compare_at_price: Optional[float] = None
    images: List[ProductImage] = []
    variants: List[ProductVariant] = []
    stock: int = 0
    sku: Optional[str] = None
    tags: List[str] = []
    is_active: bool = True
    is_featured: bool = False
    is_dropship: bool = False
    supplier_id: Optional[str] = None

class Product(ProductCreate):
    product_id: str = Field(default_factory=lambda: f"prod_{uuid.uuid4().hex[:12]}")
    business_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    short_description: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    price: Optional[float] = None
    compare_at_price: Optional[float] = None
    images: Optional[List[ProductImage]] = None
    variants: Optional[List[ProductVariant]] = None
    stock: Optional[int] = None
    sku: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    is_dropship: Optional[bool] = None
    supplier_id: Optional[str] = None

# Drop-shipping Models
class SupplierCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    contact_person: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True

class Supplier(SupplierCreate):
    supplier_id: str = Field(default_factory=lambda: f"sup_{uuid.uuid4().hex[:12]}")
    business_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DropshipOrder(BaseModel):
    dropship_id: str = Field(default_factory=lambda: f"drop_{uuid.uuid4().hex[:12]}")
    order_id: str
    supplier_id: str
    business_id: str
    items: List[Dict[str, Any]] = []
    status: DropshipStatus = DropshipStatus.PENDING
    tracking_number: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Cart Models
class CartItem(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    quantity: int = 1
    price: float
    name: str
    image_url: Optional[str] = None

class Cart(BaseModel):
    cart_id: str = Field(default_factory=lambda: f"cart_{uuid.uuid4().hex[:12]}")
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    business_id: Optional[str] = None
    items: List[CartItem] = []
    subtotal: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AddToCartRequest(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    quantity: int = 1

class UpdateCartItemRequest(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    quantity: int

# Order Models
class ShippingAddress(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "Australia"

class OrderItem(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    name: str
    price: float
    quantity: int
    image_url: Optional[str] = None
    is_dropship: bool = False
    supplier_id: Optional[str] = None

class OrderCreate(BaseModel):
    shipping_address: ShippingAddress
    payment_method: PaymentMethod = PaymentMethod.STRIPE
    notes: Optional[str] = None

class Order(BaseModel):
    order_id: str = Field(default_factory=lambda: f"order_{uuid.uuid4().hex[:12]}")
    order_number: str = Field(default_factory=lambda: f"ORD-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}")
    user_id: Optional[str] = None
    business_id: Optional[str] = None
    items: List[OrderItem] = []
    shipping_address: ShippingAddress
    subtotal: float
    shipping_cost: float = 0
    tax: float = 0
    total: float
    status: OrderStatus = OrderStatus.PENDING
    payment_status: PaymentStatus = PaymentStatus.PENDING
    payment_method: PaymentMethod
    payment_id: Optional[str] = None
    has_dropship_items: bool = False
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Auth Response
class AuthResponse(BaseModel):
    user: UserResponse
    token: str
    token_type: str = "bearer"

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, email: str, role: str, business_id: str = None) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "business_id": business_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), request: Request = None) -> Optional[dict]:
    token = None
    if credentials:
        token = credentials.credentials
    if not token and request:
        token = request.cookies.get("session_token")
    if not token:
        return None
    try:
        return decode_jwt_token(token)
    except:
        return None

async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security), request: Request = None) -> dict:
    user = await get_current_user(credentials, request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user

async def require_staff(credentials: HTTPAuthorizationCredentials = Depends(security), request: Request = None) -> dict:
    user = await require_auth(credentials, request)
    if user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.STAFF]:
        raise HTTPException(status_code=403, detail="Staff access required")
    return user

async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security), request: Request = None) -> dict:
    user = await require_auth(credentials, request)
    if user.get("role") not in [UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_super_admin(credentials: HTTPAuthorizationCredentials = Depends(security), request: Request = None) -> dict:
    user = await require_auth(credentials, request)
    if user.get("role") != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return user

def get_business_filter(user: dict) -> dict:
    """Returns MongoDB filter based on user's business access"""
    if user.get("role") == UserRole.SUPER_ADMIN:
        return {}  # Super admin sees all
    return {"business_id": user.get("business_id")}

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Multi-Business E-Commerce API", "version": "2.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=AuthResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_dict = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "phone": user_data.phone,
        "role": user_data.role if user_data.role else UserRole.CUSTOMER,
        "business_id": user_data.business_id,
        "password_hash": hash_password(user_data.password),
        "is_active": True,
        "picture": None,
        "address": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_dict)
    user_dict.pop("_id", None)
    user_dict.pop("password_hash", None)
    
    token = create_jwt_token(user_id, user_data.email, user_dict["role"], user_data.business_id)
    
    return AuthResponse(
        user=UserResponse(**user_dict),
        token=token
    )

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(credentials.password, user_doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user_doc.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is disabled")
    
    token = create_jwt_token(
        user_doc["user_id"], 
        user_doc["email"], 
        user_doc["role"],
        user_doc.get("business_id")
    )
    
    user_doc.pop("password_hash", None)
    
    return AuthResponse(
        user=UserResponse(
            user_id=user_doc["user_id"],
            email=user_doc["email"],
            name=user_doc["name"],
            phone=user_doc.get("phone"),
            role=user_doc["role"],
            business_id=user_doc.get("business_id"),
            picture=user_doc.get("picture"),
            is_active=user_doc.get("is_active", True),
            created_at=user_doc["created_at"]
        ),
        token=token
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(require_auth)):
    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user_doc)

@api_router.put("/auth/profile")
async def update_profile(update_data: UserUpdate, user: dict = Depends(require_auth)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if update_dict:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update_dict})
    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return user_doc

@api_router.post("/auth/change-password")
async def change_password(data: PasswordChange, user: dict = Depends(require_auth)):
    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(data.current_password, user_doc.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    new_hash = hash_password(data.new_password)
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"password_hash": new_hash}})
    
    return {"message": "Password changed successfully"}

@api_router.post("/auth/session")
async def exchange_session(request: Request):
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        auth_data = response.json()
    
    email = auth_data.get("email")
    user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    
    if not user_doc:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": auth_data.get("name", email.split("@")[0]),
            "picture": auth_data.get("picture"),
            "role": UserRole.CUSTOMER,
            "business_id": None,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        user_doc.pop("_id", None)
    else:
        if auth_data.get("picture") and user_doc.get("picture") != auth_data.get("picture"):
            await db.users.update_one({"email": email}, {"$set": {"picture": auth_data.get("picture")}})
            user_doc["picture"] = auth_data.get("picture")
    
    token = create_jwt_token(user_doc["user_id"], user_doc["email"], user_doc["role"], user_doc.get("business_id"))
    
    return {
        "user": UserResponse(
            user_id=user_doc["user_id"],
            email=user_doc["email"],
            name=user_doc["name"],
            phone=user_doc.get("phone"),
            role=user_doc["role"],
            business_id=user_doc.get("business_id"),
            picture=user_doc.get("picture"),
            is_active=user_doc.get("is_active", True),
            created_at=user_doc.get("created_at", datetime.now(timezone.utc).isoformat())
        ),
        "token": token
    }

@api_router.post("/auth/logout")
async def logout(user: dict = Depends(require_auth)):
    return {"message": "Logged out successfully"}

# ==================== PLATFORM SETTINGS (SUPER ADMIN) ====================

@api_router.get("/platform/settings")
async def get_platform_settings():
    settings = await db.platform_settings.find_one({}, {"_id": 0})
    if not settings:
        default = PlatformSettings()
        settings = default.model_dump()
        await db.platform_settings.insert_one(settings)
    return settings

@api_router.put("/platform/settings")
async def update_platform_settings(settings: Dict[str, Any] = Body(...), user: dict = Depends(require_super_admin)):
    settings["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.platform_settings.update_one({}, {"$set": settings}, upsert=True)
    return await db.platform_settings.find_one({}, {"_id": 0})

# ==================== BUSINESS MANAGEMENT (SUPER ADMIN) ====================

@api_router.get("/businesses")
async def get_businesses(user: dict = Depends(require_super_admin)):
    businesses = await db.businesses.find({}, {"_id": 0}).to_list(100)
    return businesses

@api_router.get("/businesses/{business_id}")
async def get_business(business_id: str, user: dict = Depends(require_admin)):
    if user["role"] != UserRole.SUPER_ADMIN and user.get("business_id") != business_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    business = await db.businesses.find_one({"business_id": business_id}, {"_id": 0})
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business

@api_router.post("/businesses")
async def create_business(data: BusinessCreate, user: dict = Depends(require_super_admin)):
    existing = await db.businesses.find_one({"slug": data.slug}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Business slug already exists")
    
    business = Business(**data.model_dump())
    business_dict = business.model_dump()
    business_dict["created_at"] = business_dict["created_at"].isoformat()
    await db.businesses.insert_one(business_dict)
    business_dict.pop("_id", None)
    return business_dict

@api_router.put("/businesses/{business_id}")
async def update_business(business_id: str, data: Dict[str, Any] = Body(...), user: dict = Depends(require_admin)):
    if user["role"] != UserRole.SUPER_ADMIN and user.get("business_id") != business_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    data.pop("business_id", None)
    data.pop("created_at", None)
    
    result = await db.businesses.update_one({"business_id": business_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Business not found")
    return await db.businesses.find_one({"business_id": business_id}, {"_id": 0})

@api_router.delete("/businesses/{business_id}")
async def delete_business(business_id: str, user: dict = Depends(require_super_admin)):
    result = await db.businesses.delete_one({"business_id": business_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Business not found")
    return {"message": "Business deleted"}

# ==================== USER MANAGEMENT ====================

@api_router.get("/admin/users")
async def get_users(
    user: dict = Depends(require_admin),
    page: int = 1,
    limit: int = 20,
    role: Optional[str] = None,
    business_id: Optional[str] = None
):
    query = get_business_filter(user)
    if role:
        query["role"] = role
    if business_id and user["role"] == UserRole.SUPER_ADMIN:
        query["business_id"] = business_id
    
    skip = (page - 1) * limit
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    
    return {"users": users, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.post("/admin/users")
async def create_user(user_data: UserCreate, admin: dict = Depends(require_admin)):
    # Validate business access
    if admin["role"] != UserRole.SUPER_ADMIN:
        if user_data.business_id and user_data.business_id != admin.get("business_id"):
            raise HTTPException(status_code=403, detail="Cannot create user for another business")
        user_data.business_id = admin.get("business_id")
        if user_data.role in [UserRole.SUPER_ADMIN]:
            raise HTTPException(status_code=403, detail="Cannot create super admin")
    
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_dict = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "phone": user_data.phone,
        "role": user_data.role,
        "business_id": user_data.business_id,
        "password_hash": hash_password(user_data.password),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_dict)
    user_dict.pop("_id", None)
    user_dict.pop("password_hash", None)
    return user_dict

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, role: UserRole, admin: dict = Depends(require_admin)):
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Business admin can only manage users in their business
    if admin["role"] != UserRole.SUPER_ADMIN:
        if target_user.get("business_id") != admin.get("business_id"):
            raise HTTPException(status_code=403, detail="Cannot modify user from another business")
        if role == UserRole.SUPER_ADMIN:
            raise HTTPException(status_code=403, detail="Cannot assign super admin role")
    
    await db.users.update_one({"user_id": user_id}, {"$set": {"role": role}})
    return await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})

@api_router.put("/admin/users/{user_id}/password")
async def admin_reset_password(user_id: str, new_password: str = Body(..., embed=True), admin: dict = Depends(require_admin)):
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if admin["role"] != UserRole.SUPER_ADMIN:
        if target_user.get("business_id") != admin.get("business_id"):
            raise HTTPException(status_code=403, detail="Cannot modify user from another business")
    
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    new_hash = hash_password(new_password)
    await db.users.update_one({"user_id": user_id}, {"$set": {"password_hash": new_hash}})
    return {"message": "Password reset successfully"}

@api_router.put("/admin/users/{user_id}/status")
async def update_user_status(user_id: str, is_active: bool = Body(..., embed=True), admin: dict = Depends(require_admin)):
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user["role"] == UserRole.SUPER_ADMIN and admin["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Cannot modify super admin")
    
    if admin["role"] != UserRole.SUPER_ADMIN:
        if target_user.get("business_id") != admin.get("business_id"):
            raise HTTPException(status_code=403, detail="Cannot modify user from another business")
    
    await db.users.update_one({"user_id": user_id}, {"$set": {"is_active": is_active}})
    return {"message": f"User {'activated' if is_active else 'deactivated'} successfully"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user["role"] == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Cannot delete super admin")
    
    if admin["role"] != UserRole.SUPER_ADMIN:
        if target_user.get("business_id") != admin.get("business_id"):
            raise HTTPException(status_code=403, detail="Cannot delete user from another business")
    
    result = await db.users.delete_one({"user_id": user_id})
    return {"message": "User deleted"}

# ==================== CATEGORY ROUTES ====================

@api_router.get("/categories")
async def get_categories(business_id: Optional[str] = None, is_active: bool = True):
    query = {}
    if is_active:
        query["is_active"] = True
    if business_id:
        query["$or"] = [{"business_id": business_id}, {"business_id": None}]
    
    categories = await db.categories.find(query, {"_id": 0}).to_list(100)
    return categories

@api_router.get("/categories/{category_id}")
async def get_category(category_id: str):
    category = await db.categories.find_one({"category_id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

@api_router.post("/admin/categories")
async def create_category(category_data: CategoryCreate, user: dict = Depends(require_admin)):
    category = Category(**category_data.model_dump())
    cat_dict = category.model_dump()
    cat_dict["business_id"] = user.get("business_id") if user["role"] != UserRole.SUPER_ADMIN else None
    cat_dict["created_at"] = cat_dict["created_at"].isoformat()
    await db.categories.insert_one(cat_dict)
    cat_dict.pop("_id", None)
    return cat_dict

@api_router.put("/admin/categories/{category_id}")
async def update_category(category_id: str, category_data: CategoryCreate, user: dict = Depends(require_admin)):
    query = {"category_id": category_id}
    if user["role"] != UserRole.SUPER_ADMIN:
        query["$or"] = [{"business_id": user.get("business_id")}, {"business_id": None}]
    
    result = await db.categories.update_one(query, {"$set": category_data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return await db.categories.find_one({"category_id": category_id}, {"_id": 0})

@api_router.delete("/admin/categories/{category_id}")
async def delete_category(category_id: str, user: dict = Depends(require_admin)):
    query = {"category_id": category_id}
    if user["role"] != UserRole.SUPER_ADMIN:
        query["business_id"] = user.get("business_id")
    
    result = await db.categories.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

# ==================== PRODUCT ROUTES ====================

@api_router.get("/products")
async def get_products(
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    is_featured: Optional[bool] = None,
    is_active: Optional[bool] = True,
    business_id: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    limit: int = 20
):
    query = {}
    if is_active is True:
        query["is_active"] = True
    if category_id:
        query["category_id"] = category_id
    if is_featured is not None:
        query["is_featured"] = is_featured
    if business_id:
        query["business_id"] = business_id
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search.lower()]}}
        ]
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    if max_price is not None:
        query.setdefault("price", {})["$lte"] = max_price
    
    sort_direction = -1 if sort_order == "desc" else 1
    skip = (page - 1) * limit
    
    products = await db.products.find(query, {"_id": 0}).sort(sort_by, sort_direction).skip(skip).limit(limit).to_list(limit)
    total = await db.products.count_documents(query)
    
    return {"products": products, "total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit}

@api_router.get("/products/featured")
async def get_featured_products(limit: int = 8, business_id: Optional[str] = None):
    query = {"is_active": True, "is_featured": True}
    if business_id:
        query["business_id"] = business_id
    products = await db.products.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return products

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.get("/products/slug/{slug}")
async def get_product_by_slug(slug: str):
    product = await db.products.find_one({"slug": slug}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.post("/admin/products")
async def create_product(product_data: ProductCreate, user: dict = Depends(require_admin)):
    existing = await db.products.find_one({"slug": product_data.slug}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail=f"Product with slug '{product_data.slug}' already exists")
    
    product = Product(**product_data.model_dump())
    prod_dict = product.model_dump()
    prod_dict["business_id"] = user.get("business_id") if user["role"] != UserRole.SUPER_ADMIN else None
    prod_dict["created_at"] = prod_dict["created_at"].isoformat()
    prod_dict["updated_at"] = prod_dict["updated_at"].isoformat()
    await db.products.insert_one(prod_dict)
    prod_dict.pop("_id", None)
    return prod_dict

@api_router.put("/admin/products/{product_id}")
async def update_product(product_id: str, product_data: ProductUpdate, user: dict = Depends(require_admin)):
    query = {"product_id": product_id}
    if user["role"] != UserRole.SUPER_ADMIN:
        query["business_id"] = user.get("business_id")
    
    update_dict = {k: v for k, v in product_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.products.update_one(query, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return await db.products.find_one({"product_id": product_id}, {"_id": 0})

@api_router.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(require_admin)):
    query = {"product_id": product_id}
    if user["role"] != UserRole.SUPER_ADMIN:
        query["business_id"] = user.get("business_id")
    
    result = await db.products.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

# ==================== DROP-SHIPPING ROUTES ====================

@api_router.get("/admin/suppliers")
async def get_suppliers(user: dict = Depends(require_admin)):
    query = get_business_filter(user)
    suppliers = await db.suppliers.find(query, {"_id": 0}).to_list(100)
    return suppliers

@api_router.post("/admin/suppliers")
async def create_supplier(data: SupplierCreate, user: dict = Depends(require_admin)):
    supplier = Supplier(**data.model_dump(), business_id=user.get("business_id") or "platform")
    supplier_dict = supplier.model_dump()
    supplier_dict["created_at"] = supplier_dict["created_at"].isoformat()
    await db.suppliers.insert_one(supplier_dict)
    supplier_dict.pop("_id", None)
    return supplier_dict

@api_router.put("/admin/suppliers/{supplier_id}")
async def update_supplier(supplier_id: str, data: Dict[str, Any] = Body(...), user: dict = Depends(require_admin)):
    query = {"supplier_id": supplier_id, **get_business_filter(user)}
    data.pop("supplier_id", None)
    data.pop("business_id", None)
    
    result = await db.suppliers.update_one(query, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return await db.suppliers.find_one({"supplier_id": supplier_id}, {"_id": 0})

@api_router.delete("/admin/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str, user: dict = Depends(require_admin)):
    query = {"supplier_id": supplier_id, **get_business_filter(user)}
    result = await db.suppliers.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"message": "Supplier deleted"}

@api_router.get("/admin/dropship-orders")
async def get_dropship_orders(user: dict = Depends(require_admin), status: Optional[str] = None):
    query = get_business_filter(user)
    if status:
        query["status"] = status
    orders = await db.dropship_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

@api_router.put("/admin/dropship-orders/{dropship_id}/status")
async def update_dropship_status(
    dropship_id: str, 
    status: DropshipStatus,
    tracking_number: Optional[str] = None,
    user: dict = Depends(require_admin)
):
    query = {"dropship_id": dropship_id, **get_business_filter(user)}
    update = {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if tracking_number:
        update["tracking_number"] = tracking_number
    
    result = await db.dropship_orders.update_one(query, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dropship order not found")
    return await db.dropship_orders.find_one({"dropship_id": dropship_id}, {"_id": 0})

# ==================== CART ROUTES ====================

async def get_or_create_cart(user_id: Optional[str] = None, session_id: Optional[str] = None) -> dict:
    query = {"user_id": user_id} if user_id else {"session_id": session_id}
    cart = await db.carts.find_one(query, {"_id": 0})
    
    if not cart:
        new_cart = Cart(user_id=user_id, session_id=session_id)
        cart_dict = new_cart.model_dump()
        cart_dict["created_at"] = cart_dict["created_at"].isoformat()
        cart_dict["updated_at"] = cart_dict["updated_at"].isoformat()
        await db.carts.insert_one(cart_dict)
        cart_dict.pop("_id", None)
        cart = cart_dict
    
    return cart

@api_router.get("/cart")
async def get_cart(request: Request, user: Optional[dict] = Depends(get_current_user)):
    user_id = user.get("user_id") if user else None
    session_id = request.headers.get("X-Cart-Session") or request.cookies.get("cart_session") or str(uuid.uuid4())
    
    cart = await get_or_create_cart(user_id, session_id if not user_id else None)
    cart["session_id"] = session_id
    return cart

@api_router.post("/cart/add")
async def add_to_cart(item: AddToCartRequest, request: Request, user: Optional[dict] = Depends(get_current_user)):
    user_id = user.get("user_id") if user else None
    session_id = request.headers.get("X-Cart-Session") or request.cookies.get("cart_session") or str(uuid.uuid4())
    
    product = await db.products.find_one({"product_id": item.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    cart = await get_or_create_cart(user_id, session_id if not user_id else None)
    
    cart_items = cart.get("items", [])
    found = False
    for cart_item in cart_items:
        if cart_item["product_id"] == item.product_id and cart_item.get("variant_id") == item.variant_id:
            cart_item["quantity"] += item.quantity
            found = True
            break
    
    if not found:
        price = product["price"]
        if item.variant_id:
            for variant in product.get("variants", []):
                if variant["variant_id"] == item.variant_id:
                    price = variant["price"]
                    break
        
        image_url = None
        for img in product.get("images", []):
            if img.get("is_primary"):
                image_url = img["url"]
                break
        if not image_url and product.get("images"):
            image_url = product["images"][0]["url"]
        
        cart_items.append({
            "product_id": item.product_id,
            "variant_id": item.variant_id,
            "quantity": item.quantity,
            "price": price,
            "name": product["name"],
            "image_url": image_url
        })
    
    subtotal = sum(i["price"] * i["quantity"] for i in cart_items)
    
    query = {"user_id": user_id} if user_id else {"session_id": session_id}
    await db.carts.update_one(
        query,
        {"$set": {"items": cart_items, "subtotal": subtotal, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    cart = await db.carts.find_one(query, {"_id": 0})
    cart["session_id"] = session_id
    return cart

@api_router.put("/cart/update")
async def update_cart_item(item: UpdateCartItemRequest, request: Request, user: Optional[dict] = Depends(get_current_user)):
    user_id = user.get("user_id") if user else None
    session_id = request.headers.get("X-Cart-Session") or request.cookies.get("cart_session")
    
    query = {"user_id": user_id} if user_id else {"session_id": session_id}
    cart = await db.carts.find_one(query, {"_id": 0})
    
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    cart_items = cart.get("items", [])
    if item.quantity <= 0:
        cart_items = [i for i in cart_items if not (i["product_id"] == item.product_id and i.get("variant_id") == item.variant_id)]
    else:
        for cart_item in cart_items:
            if cart_item["product_id"] == item.product_id and cart_item.get("variant_id") == item.variant_id:
                cart_item["quantity"] = item.quantity
                break
    
    subtotal = sum(i["price"] * i["quantity"] for i in cart_items)
    
    await db.carts.update_one(
        query,
        {"$set": {"items": cart_items, "subtotal": subtotal, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return await db.carts.find_one(query, {"_id": 0})

@api_router.delete("/cart/item/{product_id}")
async def remove_from_cart(product_id: str, variant_id: Optional[str] = None, request: Request = None, user: Optional[dict] = Depends(get_current_user)):
    user_id = user.get("user_id") if user else None
    session_id = request.headers.get("X-Cart-Session") or request.cookies.get("cart_session") if request else None
    
    query = {"user_id": user_id} if user_id else {"session_id": session_id}
    cart = await db.carts.find_one(query, {"_id": 0})
    
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    cart_items = [i for i in cart.get("items", []) if not (i["product_id"] == product_id and i.get("variant_id") == variant_id)]
    subtotal = sum(i["price"] * i["quantity"] for i in cart_items)
    
    await db.carts.update_one(
        query,
        {"$set": {"items": cart_items, "subtotal": subtotal, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return await db.carts.find_one(query, {"_id": 0})

@api_router.delete("/cart/clear")
async def clear_cart(request: Request, user: Optional[dict] = Depends(get_current_user)):
    user_id = user.get("user_id") if user else None
    session_id = request.headers.get("X-Cart-Session") or request.cookies.get("cart_session")
    
    query = {"user_id": user_id} if user_id else {"session_id": session_id}
    await db.carts.update_one(
        query,
        {"$set": {"items": [], "subtotal": 0, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Cart cleared"}

# ==================== ORDER ROUTES ====================

@api_router.post("/orders")
async def create_order(order_data: OrderCreate, request: Request, user: Optional[dict] = Depends(get_current_user)):
    user_id = user.get("user_id") if user else None
    session_id = request.headers.get("X-Cart-Session") or request.cookies.get("cart_session")
    
    query = {"user_id": user_id} if user_id else {"session_id": session_id}
    cart = await db.carts.find_one(query, {"_id": 0})
    
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    subtotal = cart["subtotal"]
    shipping_cost = 10.0 if subtotal < 100 else 0
    tax = round(subtotal * 0.1, 2)
    total = subtotal + shipping_cost + tax
    
    # Check for dropship items
    has_dropship = False
    order_items = []
    for item in cart["items"]:
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        order_item = OrderItem(**item)
        if product and product.get("is_dropship"):
            order_item.is_dropship = True
            order_item.supplier_id = product.get("supplier_id")
            has_dropship = True
        order_items.append(order_item)
    
    order = Order(
        user_id=user_id,
        business_id=user.get("business_id") if user else None,
        items=order_items,
        shipping_address=order_data.shipping_address,
        subtotal=subtotal,
        shipping_cost=shipping_cost,
        tax=tax,
        total=total,
        payment_method=order_data.payment_method,
        has_dropship_items=has_dropship,
        notes=order_data.notes
    )
    
    order_dict = order.model_dump()
    order_dict["created_at"] = order_dict["created_at"].isoformat()
    order_dict["updated_at"] = order_dict["updated_at"].isoformat()
    order_dict["shipping_address"] = order_data.shipping_address.model_dump()
    order_dict["items"] = [item.model_dump() for item in order.items]
    
    await db.orders.insert_one(order_dict)
    order_dict.pop("_id", None)
    
    # Create dropship orders for suppliers
    if has_dropship:
        supplier_items = {}
        for item in order_dict["items"]:
            if item.get("is_dropship") and item.get("supplier_id"):
                sid = item["supplier_id"]
                if sid not in supplier_items:
                    supplier_items[sid] = []
                supplier_items[sid].append(item)
        
        for supplier_id, items in supplier_items.items():
            dropship = DropshipOrder(
                order_id=order_dict["order_id"],
                supplier_id=supplier_id,
                business_id=order_dict.get("business_id") or "platform",
                items=items
            )
            ds_dict = dropship.model_dump()
            ds_dict["created_at"] = ds_dict["created_at"].isoformat()
            ds_dict["updated_at"] = ds_dict["updated_at"].isoformat()
            await db.dropship_orders.insert_one(ds_dict)
    
    # Clear cart
    await db.carts.update_one(query, {"$set": {"items": [], "subtotal": 0}})
    
    return order_dict

@api_router.get("/orders")
async def get_orders(user: dict = Depends(require_auth), page: int = 1, limit: int = 10):
    skip = (page - 1) * limit
    orders = await db.orders.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.orders.count_documents({"user_id": user["user_id"]})
    return {"orders": orders, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(require_auth)):
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.get("user_id") != user["user_id"] and user["role"] not in [UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.STAFF]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return order

@api_router.get("/admin/orders")
async def get_all_orders(
    user: dict = Depends(require_staff),
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    query = get_business_filter(user)
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.orders.count_documents(query)
    
    return {"orders": orders, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, status: OrderStatus, user: dict = Depends(require_staff)):
    query = {"order_id": order_id, **get_business_filter(user)}
    result = await db.orders.update_one(
        query,
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return await db.orders.find_one({"order_id": order_id}, {"_id": 0})

# ==================== PAYMENT ROUTES ====================

@api_router.post("/checkout/stripe/create-session")
async def create_stripe_checkout(request: Request, user: Optional[dict] = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    body = await request.json()
    order_id = body.get("order_id")
    origin_url = body.get("origin_url")
    
    if not order_id or not origin_url:
        raise HTTPException(status_code=400, detail="order_id and origin_url required")
    
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    success_url = f"{origin_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/checkout/payment?order_id={order_id}"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(order["total"]),
        currency="aud",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"order_id": order_id}
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/checkout/stripe/status/{session_id}")
async def get_stripe_status(session_id: str):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    status = await stripe_checkout.get_checkout_status(session_id)
    
    if status.payment_status == "paid":
        if status.metadata and status.metadata.get("order_id"):
            await db.orders.update_one(
                {"order_id": status.metadata["order_id"]},
                {"$set": {
                    "payment_status": PaymentStatus.COMPLETED,
                    "status": OrderStatus.CONFIRMED,
                    "payment_id": session_id,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
    
    return status

# ==================== DASHBOARD STATS ====================

@api_router.get("/admin/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(require_staff)):
    query = get_business_filter(user)
    
    total_orders = await db.orders.count_documents(query)
    pending_orders = await db.orders.count_documents({**query, "status": OrderStatus.PENDING})
    
    product_query = query.copy()
    total_products = await db.products.count_documents(product_query)
    
    user_query = query.copy()
    total_users = await db.users.count_documents(user_query)
    
    pipeline = [
        {"$match": {**query, "payment_status": PaymentStatus.COMPLETED}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    recent_orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    # Dropship stats
    dropship_query = query.copy()
    pending_dropship = await db.dropship_orders.count_documents({**dropship_query, "status": DropshipStatus.PENDING})
    
    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "total_products": total_products,
        "total_users": total_users,
        "total_revenue": total_revenue,
        "pending_dropship": pending_dropship,
        "recent_orders": recent_orders
    }

# ==================== SETTINGS ====================

@api_router.get("/settings")
async def get_settings(business_id: Optional[str] = None):
    if business_id:
        business = await db.businesses.find_one({"business_id": business_id}, {"_id": 0})
        if business:
            return {
                "website_name": business.get("name", "Store"),
                "logo_url": business.get("logo_url"),
                "primary_color": business.get("primary_color", "#00ACAC"),
                "business_id": business_id
            }
    
    platform = await db.platform_settings.find_one({}, {"_id": 0})
    return {
        "website_name": platform.get("platform_name", "ShopStore") if platform else "ShopStore",
        "logo_url": platform.get("platform_logo_url") if platform else None,
        "primary_color": "#00ACAC",
        "show_powered_by": platform.get("show_powered_by", True) if platform else True
    }

@api_router.get("/admin/settings")
async def get_admin_settings(user: dict = Depends(require_admin)):
    if user["role"] == UserRole.SUPER_ADMIN:
        return await db.platform_settings.find_one({}, {"_id": 0}) or PlatformSettings().model_dump()
    else:
        business = await db.businesses.find_one({"business_id": user.get("business_id")}, {"_id": 0})
        return business or {}

@api_router.put("/admin/settings")
async def update_admin_settings(settings: Dict[str, Any] = Body(...), user: dict = Depends(require_admin)):
    if user["role"] == UserRole.SUPER_ADMIN:
        await db.platform_settings.update_one({}, {"$set": settings}, upsert=True)
        return await db.platform_settings.find_one({}, {"_id": 0})
    else:
        await db.businesses.update_one(
            {"business_id": user.get("business_id")},
            {"$set": settings}
        )
        return await db.businesses.find_one({"business_id": user.get("business_id")}, {"_id": 0})

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("business_id")
    await db.products.create_index("product_id", unique=True)
    await db.products.create_index("slug", unique=True)
    await db.products.create_index("business_id")
    await db.categories.create_index("category_id", unique=True)
    await db.businesses.create_index("business_id", unique=True)
    await db.businesses.create_index("slug", unique=True)
    await db.suppliers.create_index("supplier_id", unique=True)
    await db.orders.create_index("order_id", unique=True)
    await db.orders.create_index("business_id")
    await db.dropship_orders.create_index("dropship_id", unique=True)
    await db.carts.create_index("user_id")
    await db.carts.create_index("session_id")
    
    # Create default platform settings
    if await db.platform_settings.count_documents({}) == 0:
        await db.platform_settings.insert_one(PlatformSettings().model_dump())
    
    # Create super admin if not exists
    super_admin = await db.users.find_one({"role": UserRole.SUPER_ADMIN})
    if not super_admin:
        admin_dict = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": "superadmin@platform.com",
            "name": "Super Admin",
            "role": UserRole.SUPER_ADMIN,
            "business_id": None,
            "password_hash": hash_password("superadmin123"),
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_dict)
        logger.info("Created super admin: superadmin@platform.com / superadmin123")
    
    logger.info("Multi-Business E-Commerce API started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
