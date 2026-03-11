from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, BackgroundTasks, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
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
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Create the main app
app = FastAPI(title="E-Commerce API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== ENUMS ====================
class UserRole(str, Enum):
    ADMIN = "admin"
    CUSTOMER = "customer"
    SUPER_ADMIN = "super_admin"

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

# ==================== MODELS ====================

# Organization/Tenant
class OrganizationSettings(BaseModel):
    org_id: str = Field(default_factory=lambda: f"org_{uuid.uuid4().hex[:12]}")
    website_name: str = "My Store"
    logo_url: Optional[str] = None
    primary_color: str = "#00ACAC"
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_bsb: Optional[str] = None
    email_from_address: Optional[str] = None
    email_from_name: Optional[str] = None
    sendgrid_api_key: Optional[str] = None
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None
    stripe_enabled: bool = True
    paypal_enabled: bool = False
    paypal_client_id: Optional[str] = None
    paypal_secret: Optional[str] = None
    razorpay_enabled: bool = False
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrganizationSettingsUpdate(BaseModel):
    website_name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_bsb: Optional[str] = None
    email_from_address: Optional[str] = None
    email_from_name: Optional[str] = None
    sendgrid_api_key: Optional[str] = None
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None
    stripe_enabled: Optional[bool] = None
    paypal_enabled: Optional[bool] = None
    paypal_client_id: Optional[str] = None
    paypal_secret: Optional[str] = None
    razorpay_enabled: Optional[bool] = None
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None

# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    role: UserRole = UserRole.CUSTOMER
    picture: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    phone: Optional[str] = None
    role: str
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

class Product(ProductCreate):
    product_id: str = Field(default_factory=lambda: f"prod_{uuid.uuid4().hex[:12]}")
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

class OrderCreate(BaseModel):
    shipping_address: ShippingAddress
    payment_method: PaymentMethod = PaymentMethod.STRIPE
    notes: Optional[str] = None

class Order(BaseModel):
    order_id: str = Field(default_factory=lambda: f"order_{uuid.uuid4().hex[:12]}")
    order_number: str = Field(default_factory=lambda: f"ORD-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}")
    user_id: Optional[str] = None
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
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Payment Transaction
class PaymentTransaction(BaseModel):
    transaction_id: str = Field(default_factory=lambda: f"txn_{uuid.uuid4().hex[:12]}")
    order_id: str
    user_id: Optional[str] = None
    amount: float
    currency: str = "AUD"
    payment_method: PaymentMethod
    session_id: Optional[str] = None
    status: PaymentStatus = PaymentStatus.PENDING
    metadata: Dict[str, Any] = {}
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

def create_jwt_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
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
    
    # Try to get token from Authorization header
    if credentials:
        token = credentials.credentials
    
    # Try to get token from cookies
    if not token and request:
        token = request.cookies.get("session_token")
    
    if not token:
        return None
    
    try:
        payload = decode_jwt_token(token)
        return payload
    except:
        return None

async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security), request: Request = None) -> dict:
    user = await get_current_user(credentials, request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user

async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security), request: Request = None) -> dict:
    user = await require_auth(credentials, request)
    if user.get("role") not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ==================== ROUTES ====================

# Health Check
@api_router.get("/")
async def root():
    return {"message": "E-Commerce API is running", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=AuthResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        phone=user_data.phone,
        role=UserRole.CUSTOMER
    )
    
    user_dict = user.model_dump()
    user_dict["password_hash"] = hash_password(user_data.password)
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    
    token = create_jwt_token(user.user_id, user.email, user.role)
    
    return AuthResponse(
        user=UserResponse(
            user_id=user.user_id,
            email=user.email,
            name=user.name,
            phone=user.phone,
            role=user.role,
            picture=user.picture,
            is_active=user.is_active,
            created_at=user_dict["created_at"]
        ),
        token=token
    )

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user_doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user_doc["user_id"], user_doc["email"], user_doc["role"])
    
    return AuthResponse(
        user=UserResponse(
            user_id=user_doc["user_id"],
            email=user_doc["email"],
            name=user_doc["name"],
            phone=user_doc.get("phone"),
            role=user_doc["role"],
            picture=user_doc.get("picture"),
            is_active=user_doc.get("is_active", True),
            created_at=user_doc["created_at"] if isinstance(user_doc["created_at"], str) else user_doc["created_at"].isoformat()
        ),
        token=token
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(require_auth)):
    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        user_id=user_doc["user_id"],
        email=user_doc["email"],
        name=user_doc["name"],
        phone=user_doc.get("phone"),
        role=user_doc["role"],
        picture=user_doc.get("picture"),
        is_active=user_doc.get("is_active", True),
        created_at=user_doc["created_at"] if isinstance(user_doc["created_at"], str) else user_doc["created_at"].isoformat()
    )

# Emergent OAuth callback
@api_router.post("/auth/session")
async def exchange_session(request: Request):
    """Exchange Emergent OAuth session_id for user data and create session"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get user data
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        auth_data = response.json()
    
    # Find or create user
    email = auth_data.get("email")
    user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    
    if not user_doc:
        # Create new user
        user = User(
            email=email,
            name=auth_data.get("name", email.split("@")[0]),
            picture=auth_data.get("picture"),
            role=UserRole.CUSTOMER
        )
        user_dict = user.model_dump()
        user_dict["created_at"] = user_dict["created_at"].isoformat()
        await db.users.insert_one(user_dict)
        user_dict.pop("_id", None)  # Remove MongoDB _id
        user_doc = user_dict
    else:
        # Update picture if changed
        if auth_data.get("picture") and user_doc.get("picture") != auth_data.get("picture"):
            await db.users.update_one(
                {"email": email},
                {"$set": {"picture": auth_data.get("picture")}}
            )
            user_doc["picture"] = auth_data.get("picture")
    
    # Create JWT token
    token = create_jwt_token(user_doc["user_id"], user_doc["email"], user_doc["role"])
    
    # Store session
    session_token = auth_data.get("session_token", token)
    await db.user_sessions.insert_one({
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "user": UserResponse(
            user_id=user_doc["user_id"],
            email=user_doc["email"],
            name=user_doc["name"],
            phone=user_doc.get("phone"),
            role=user_doc["role"],
            picture=user_doc.get("picture"),
            is_active=user_doc.get("is_active", True),
            created_at=user_doc["created_at"] if isinstance(user_doc["created_at"], str) else user_doc["created_at"].isoformat()
        ),
        "token": token,
        "session_token": session_token
    }

@api_router.post("/auth/logout")
async def logout(user: dict = Depends(require_auth)):
    await db.user_sessions.delete_many({"user_id": user["user_id"]})
    return {"message": "Logged out successfully"}

# ==================== ORGANIZATION SETTINGS ====================

@api_router.get("/settings")
async def get_settings():
    """Get public organization settings"""
    settings = await db.organization_settings.find_one({}, {"_id": 0, "sendgrid_api_key": 0, "twilio_auth_token": 0, "paypal_secret": 0, "razorpay_key_secret": 0})
    if not settings:
        # Create default settings
        default = OrganizationSettings()
        settings_dict = default.model_dump()
        settings_dict["created_at"] = settings_dict["created_at"].isoformat()
        settings_dict["updated_at"] = settings_dict["updated_at"].isoformat()
        await db.organization_settings.insert_one(settings_dict)
        settings_dict.pop("_id", None)  # Remove MongoDB _id
        settings = settings_dict
    return settings

@api_router.get("/admin/settings")
async def get_admin_settings(user: dict = Depends(require_admin)):
    """Get all organization settings (admin only)"""
    settings = await db.organization_settings.find_one({}, {"_id": 0})
    if not settings:
        default = OrganizationSettings()
        settings_dict = default.model_dump()
        settings_dict["created_at"] = settings_dict["created_at"].isoformat()
        settings_dict["updated_at"] = settings_dict["updated_at"].isoformat()
        await db.organization_settings.insert_one(settings_dict)
        settings_dict.pop("_id", None)  # Remove MongoDB _id
        settings = settings_dict
    return settings

@api_router.put("/admin/settings")
async def update_settings(update_data: OrganizationSettingsUpdate, user: dict = Depends(require_admin)):
    """Update organization settings (admin only)"""
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.organization_settings.update_one({}, {"$set": update_dict}, upsert=True)
    settings = await db.organization_settings.find_one({}, {"_id": 0})
    return settings

# ==================== CATEGORY ROUTES ====================

@api_router.get("/categories")
async def get_categories(is_active: bool = True):
    query = {"is_active": is_active} if is_active else {}
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
    cat_dict["created_at"] = cat_dict["created_at"].isoformat()
    await db.categories.insert_one(cat_dict)
    cat_dict.pop("_id", None)  # Remove MongoDB _id
    return cat_dict

@api_router.put("/admin/categories/{category_id}")
async def update_category(category_id: str, category_data: CategoryCreate, user: dict = Depends(require_admin)):
    result = await db.categories.update_one(
        {"category_id": category_id},
        {"$set": category_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return await db.categories.find_one({"category_id": category_id}, {"_id": 0})

@api_router.delete("/admin/categories/{category_id}")
async def delete_category(category_id: str, user: dict = Depends(require_admin)):
    result = await db.categories.delete_one({"category_id": category_id})
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
    # If is_active is False or None, get all products
    if category_id:
        query["category_id"] = category_id
    if is_featured is not None:
        query["is_featured"] = is_featured
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
    
    return {
        "products": products,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@api_router.get("/products/featured")
async def get_featured_products(limit: int = 6):
    products = await db.products.find({"is_active": True, "is_featured": True}, {"_id": 0}).limit(limit).to_list(limit)
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
    product = Product(**product_data.model_dump())
    prod_dict = product.model_dump()
    prod_dict["created_at"] = prod_dict["created_at"].isoformat()
    prod_dict["updated_at"] = prod_dict["updated_at"].isoformat()
    await db.products.insert_one(prod_dict)
    prod_dict.pop("_id", None)  # Remove MongoDB _id
    return prod_dict

@api_router.put("/admin/products/{product_id}")
async def update_product(product_id: str, product_data: ProductUpdate, user: dict = Depends(require_admin)):
    update_dict = {k: v for k, v in product_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.products.update_one(
        {"product_id": product_id},
        {"$set": update_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return await db.products.find_one({"product_id": product_id}, {"_id": 0})

@api_router.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(require_admin)):
    result = await db.products.delete_one({"product_id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

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
        cart_dict.pop("_id", None)  # Remove MongoDB _id
        cart = cart_dict
    
    return cart

@api_router.get("/cart")
async def get_cart(request: Request, user: Optional[dict] = Depends(get_current_user)):
    user_id = user.get("user_id") if user else None
    session_id = request.headers.get("X-Cart-Session") or request.cookies.get("cart_session") or str(uuid.uuid4())
    
    cart = await get_or_create_cart(user_id, session_id if not user_id else None)
    # Include session_id in response for client to store
    cart["session_id"] = session_id
    return cart

@api_router.post("/cart/add")
async def add_to_cart(item: AddToCartRequest, request: Request, user: Optional[dict] = Depends(get_current_user)):
    user_id = user.get("user_id") if user else None
    session_id = request.headers.get("X-Cart-Session") or request.cookies.get("cart_session") or str(uuid.uuid4())
    
    # Get product
    product = await db.products.find_one({"product_id": item.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    cart = await get_or_create_cart(user_id, session_id if not user_id else None)
    
    # Check if item already in cart
    cart_items = cart.get("items", [])
    found = False
    for cart_item in cart_items:
        if cart_item["product_id"] == item.product_id and cart_item.get("variant_id") == item.variant_id:
            cart_item["quantity"] += item.quantity
            found = True
            break
    
    if not found:
        # Get price from variant if specified
        price = product["price"]
        if item.variant_id:
            for variant in product.get("variants", []):
                if variant["variant_id"] == item.variant_id:
                    price = variant["price"]
                    break
        
        # Get primary image
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
    
    # Calculate subtotal
    subtotal = sum(i["price"] * i["quantity"] for i in cart_items)
    
    query = {"user_id": user_id} if user_id else {"session_id": session_id}
    await db.carts.update_one(
        query,
        {"$set": {"items": cart_items, "subtotal": subtotal, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    cart = await db.carts.find_one(query, {"_id": 0})
    return cart

@api_router.put("/cart/update")
async def update_cart_item(item: UpdateCartItemRequest, request: Request, user: Optional[dict] = Depends(get_current_user)):
    user_id = user.get("user_id") if user else None
    session_id = request.cookies.get("cart_session")
    
    query = {"user_id": user_id} if user_id else {"session_id": session_id}
    cart = await db.carts.find_one(query, {"_id": 0})
    
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    cart_items = cart.get("items", [])
    if item.quantity <= 0:
        # Remove item
        cart_items = [i for i in cart_items if not (i["product_id"] == item.product_id and i.get("variant_id") == item.variant_id)]
    else:
        # Update quantity
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
    session_id = request.cookies.get("cart_session") if request else None
    
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
    session_id = request.cookies.get("cart_session")
    
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
    session_id = request.cookies.get("cart_session")
    
    # Get cart
    query = {"user_id": user_id} if user_id else {"session_id": session_id}
    cart = await db.carts.find_one(query, {"_id": 0})
    
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Calculate totals
    subtotal = cart["subtotal"]
    shipping_cost = 10.0 if subtotal < 100 else 0  # Free shipping over $100
    tax = round(subtotal * 0.1, 2)  # 10% tax
    total = subtotal + shipping_cost + tax
    
    # Create order
    order = Order(
        user_id=user_id,
        items=[OrderItem(**item) for item in cart["items"]],
        shipping_address=order_data.shipping_address,
        subtotal=subtotal,
        shipping_cost=shipping_cost,
        tax=tax,
        total=total,
        payment_method=order_data.payment_method,
        notes=order_data.notes
    )
    
    order_dict = order.model_dump()
    order_dict["created_at"] = order_dict["created_at"].isoformat()
    order_dict["updated_at"] = order_dict["updated_at"].isoformat()
    order_dict["shipping_address"] = order_data.shipping_address.model_dump()
    order_dict["items"] = [item.model_dump() for item in order.items]
    
    await db.orders.insert_one(order_dict)
    order_dict.pop("_id", None)  # Remove MongoDB _id
    
    # Clear cart after order
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
    
    # Check if user owns this order or is admin
    if order.get("user_id") != user["user_id"] and user["role"] not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return order

# Admin order routes
@api_router.get("/admin/orders")
async def get_all_orders(
    user: dict = Depends(require_admin),
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    query = {}
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.orders.count_documents(query)
    
    return {"orders": orders, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, status: OrderStatus, user: dict = Depends(require_admin)):
    result = await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return await db.orders.find_one({"order_id": order_id}, {"_id": 0})

# ==================== PAYMENT ROUTES (STRIPE) ====================

@api_router.post("/checkout/stripe/create-session")
async def create_stripe_checkout(request: Request, user: Optional[dict] = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    body = await request.json()
    order_id = body.get("order_id")
    origin_url = body.get("origin_url")
    
    if not order_id or not origin_url:
        raise HTTPException(status_code=400, detail="order_id and origin_url required")
    
    # Get order
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
        metadata={"order_id": order_id, "user_id": order.get("user_id", "")}
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction
    txn = PaymentTransaction(
        order_id=order_id,
        user_id=order.get("user_id"),
        amount=order["total"],
        currency="AUD",
        payment_method=PaymentMethod.STRIPE,
        session_id=session.session_id,
        status=PaymentStatus.PENDING,
        metadata={"checkout_url": session.url}
    )
    txn_dict = txn.model_dump()
    txn_dict["created_at"] = txn_dict["created_at"].isoformat()
    txn_dict["updated_at"] = txn_dict["updated_at"].isoformat()
    await db.payment_transactions.insert_one(txn_dict)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/checkout/stripe/status/{session_id}")
async def get_stripe_status(session_id: str):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction and order if paid
    if status.payment_status == "paid":
        txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        if txn and txn["status"] != PaymentStatus.COMPLETED:
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"status": PaymentStatus.COMPLETED, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            await db.orders.update_one(
                {"order_id": txn["order_id"]},
                {"$set": {
                    "payment_status": PaymentStatus.COMPLETED,
                    "status": OrderStatus.CONFIRMED,
                    "payment_id": session_id,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
    
    return status

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    api_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    try:
        event = await stripe_checkout.handle_webhook(body, signature)
        
        if event.payment_status == "paid":
            session_id = event.session_id
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"status": PaymentStatus.COMPLETED, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            if txn:
                await db.orders.update_one(
                    {"order_id": txn["order_id"]},
                    {"$set": {
                        "payment_status": PaymentStatus.COMPLETED,
                        "status": OrderStatus.CONFIRMED,
                        "payment_id": session_id,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
        
        return {"status": "processed"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

# ==================== ADMIN USER MANAGEMENT ====================

@api_router.get("/admin/users")
async def get_users(user: dict = Depends(require_admin), page: int = 1, limit: int = 20, role: Optional[str] = None):
    query = {}
    if role:
        query["role"] = role
    
    skip = (page - 1) * limit
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    
    return {"users": users, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, role: UserRole, admin: dict = Depends(require_admin)):
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": role}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.users.delete_one({"user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

# ==================== ADMIN DASHBOARD STATS ====================

@api_router.get("/admin/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(require_admin)):
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"status": OrderStatus.PENDING})
    total_products = await db.products.count_documents({})
    total_users = await db.users.count_documents({})
    
    # Calculate revenue
    pipeline = [
        {"$match": {"payment_status": PaymentStatus.COMPLETED}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Recent orders
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "total_products": total_products,
        "total_users": total_users,
        "total_revenue": total_revenue,
        "recent_orders": recent_orders
    }

# ==================== AI FEATURES ====================

@api_router.post("/ai/recommendations")
async def get_ai_recommendations(request: Request):
    """Get AI-powered product recommendations"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        body = await request.json()
        product_id = body.get("product_id")
        category_id = body.get("category_id")
        
        # Get current product or category products
        products = []
        if product_id:
            product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
            if product:
                # Get similar products from same category
                products = await db.products.find(
                    {"category_id": product.get("category_id"), "product_id": {"$ne": product_id}, "is_active": True},
                    {"_id": 0}
                ).limit(10).to_list(10)
        elif category_id:
            products = await db.products.find({"category_id": category_id, "is_active": True}, {"_id": 0}).limit(10).to_list(10)
        else:
            products = await db.products.find({"is_active": True, "is_featured": True}, {"_id": 0}).limit(10).to_list(10)
        
        if not products:
            return {"recommendations": []}
        
        # Use AI to rank/recommend
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            # Return products without AI ranking
            return {"recommendations": products[:4]}
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"rec_{uuid.uuid4().hex[:8]}",
            system_message="You are a product recommendation assistant. Given a list of products, return the top 4 product IDs that would be most appealing to customers, as a JSON array of product_ids."
        ).with_model("openai", "gpt-5.2")
        
        product_list = [{"id": p["product_id"], "name": p["name"], "price": p["price"], "description": p.get("short_description", "")} for p in products]
        
        response = await chat.send_message(UserMessage(text=f"Recommend top 4 from these products: {product_list}. Return only a JSON array of product_ids."))
        
        # Parse response and return matching products
        import json
        try:
            recommended_ids = json.loads(response)
            recommended = [p for p in products if p["product_id"] in recommended_ids]
            return {"recommendations": recommended[:4]}
        except:
            return {"recommendations": products[:4]}
    
    except Exception as e:
        logger.error(f"AI recommendation error: {e}")
        # Fallback to featured products
        products = await db.products.find({"is_active": True, "is_featured": True}, {"_id": 0}).limit(4).to_list(4)
        return {"recommendations": products}

@api_router.get("/ai/search-suggestions")
async def get_search_suggestions(q: str = Query(..., min_length=2)):
    """Get AI-powered search suggestions"""
    try:
        # First, do a basic search
        products = await db.products.find(
            {"$or": [
                {"name": {"$regex": q, "$options": "i"}},
                {"tags": {"$in": [q.lower()]}}
            ], "is_active": True},
            {"_id": 0, "name": 1, "product_id": 1}
        ).limit(5).to_list(5)
        
        categories = await db.categories.find(
            {"name": {"$regex": q, "$options": "i"}, "is_active": True},
            {"_id": 0, "name": 1, "category_id": 1}
        ).limit(3).to_list(3)
        
        return {
            "products": products,
            "categories": categories,
            "suggestions": [p["name"] for p in products]
        }
    except Exception as e:
        logger.error(f"Search suggestion error: {e}")
        return {"products": [], "categories": [], "suggestions": []}

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
    await db.products.create_index("product_id", unique=True)
    await db.products.create_index("slug", unique=True)
    await db.products.create_index("category_id")
    await db.categories.create_index("category_id", unique=True)
    await db.categories.create_index("slug", unique=True)
    await db.orders.create_index("order_id", unique=True)
    await db.orders.create_index("user_id")
    await db.carts.create_index("user_id")
    await db.carts.create_index("session_id")
    
    # Seed initial data if empty
    if await db.organization_settings.count_documents({}) == 0:
        default_settings = OrganizationSettings()
        settings_dict = default_settings.model_dump()
        settings_dict["created_at"] = settings_dict["created_at"].isoformat()
        settings_dict["updated_at"] = settings_dict["updated_at"].isoformat()
        await db.organization_settings.insert_one(settings_dict)
        logger.info("Created default organization settings")
    
    # Create default admin if not exists
    admin_exists = await db.users.find_one({"role": UserRole.ADMIN})
    if not admin_exists:
        admin = User(
            email="admin@store.com",
            name="Store Admin",
            role=UserRole.ADMIN
        )
        admin_dict = admin.model_dump()
        admin_dict["password_hash"] = hash_password("admin123")
        admin_dict["created_at"] = admin_dict["created_at"].isoformat()
        await db.users.insert_one(admin_dict)
        logger.info("Created default admin user: admin@store.com / admin123")
    
    logger.info("E-Commerce API started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
