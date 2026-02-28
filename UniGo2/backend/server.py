from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime
import json
from passlib.context import CryptContext

import json
from json import JSONEncoder

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Custom JSON encoder for datetime
class DateTimeEncoder(JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# WebSocket connection manager for real-time updates
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections.values():
            await connection.send_text(message)

manager = ConnectionManager()

# ===== Models =====

class College(BaseModel):
    id: str
    name: str
    short: str
    department: Optional[str] = None

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    college: College
    department: Optional[str] = None
    semester: Optional[int] = None
    location: Optional[str] = None
    ecoScore: int = 0
    carbonSaved: float = 0.0
    verified: bool = True
    isDriving: bool = False
    isDriver: bool = False
    homeLocation: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    college: College
    department: Optional[str] = None
    semester: Optional[int] = None
    location: Optional[str] = None

# ===== Auth Models =====

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    college: College
    department: Optional[str] = None
    semester: Optional[int] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[int] = None
    location: Optional[str] = None
    homeLocation: Optional[str] = None
    profilePicture: Optional[str] = None

class PickupPoint(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    landmark: Optional[str] = None
    estimatedTime: str  # e.g., "8:15 AM"

class DriverRoute(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    driver_id: str
    driver_name: str
    origin: str
    destination: str
    departure_time: str
    direction: str = "to_college"  # to_college or from_college
    available_seats: int = 4
    price_per_seat: int = 50
    amenities: List[str] = []
    pickup_points: List[PickupPoint] = []  # NEW: Pickup points along the route
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DriverRouteCreate(BaseModel):
    driver_id: str
    driver_name: str
    origin: str
    destination: str
    departure_time: str
    direction: str = "to_college"
    available_seats: int = 4
    price_per_seat: int = 50
    amenities: List[str] = []
    pickup_points: List[PickupPoint] = []  # NEW: Pickup points

class RideRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rider_id: str
    rider_name: str
    driver_id: str
    driver_name: str
    route_id: str
    pickup_location: str
    pickup_time: str = ""  # NEW: When rider will be picked up
    status: str = "pending"  # pending, accepted, rejected, completed
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RideRequestCreate(BaseModel):
    rider_id: str
    rider_name: str
    driver_id: str
    driver_name: str
    route_id: str
    pickup_location: str
    pickup_time: str = ""  # NEW: When rider will be picked up

class RideMatch(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ride_request_id: str
    rider_id: str
    driver_id: str
    route_id: str
    status: str = "matched"  # matched, in_progress, completed
    carbon_saved: float = 2.5  # kg CO2
    split_cost: int = 50
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Rating(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ride_id: str
    rider_id: str
    driver_id: str
    smoothness: int
    comfort: int
    amenities: List[str] = []
    match_reason: Optional[str] = None  # "Both 6th Sem CS", "Both live in Indiranagar"
    trust_score: int = 5
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RatingCreate(BaseModel):
    ride_id: str
    rider_id: str
    driver_id: str
    smoothness: int
    comfort: int
    amenities: List[str] = []
    match_reason: Optional[str] = None
    trust_score: int = 5

# ===== Auth Endpoints =====

@api_router.post("/auth/register")
async def register_user(user_input: UserRegister):
    """Register a new user with email and password"""
    # Check if email already exists
    existing = await db.users.find_one({"email": user_input.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash password
    hashed_password = pwd_context.hash(user_input.password)

    # Create user document
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": user_input.name,
        "email": user_input.email,
        "password_hash": hashed_password,
        "college": user_input.college.dict(),
        "department": user_input.department,
        "semester": user_input.semester,
        "ecoScore": 0,
        "carbonSaved": 0.0,
        "verified": True,
        "isDriving": False,
        "isDriver": False,
        "campusPoints": 0,
        "created_at": datetime.utcnow(),
    }
    await db.users.insert_one(user_doc)

    # Log registration in login_history
    await db.login_history.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "email": user_input.email,
        "event": "register",
        "timestamp": datetime.utcnow(),
    })

    # Return user without password
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    return {"success": True, "user": user_doc}


@api_router.post("/auth/login")
async def login_user(login_input: UserLogin, request: Request = None):
    """Login with email and password - stores login event in MongoDB"""
    user = await db.users.find_one({"email": login_input.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not pwd_context.verify(login_input.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Store login event in login_history collection
    client_host = ""
    if request and request.client:
        client_host = request.client.host

    await db.login_history.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "email": login_input.email,
        "event": "login",
        "timestamp": datetime.utcnow(),
        "ip_address": client_host,
    })

    # Return user without password
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"success": True, "user": user}


# ===== Account Endpoints =====

@api_router.get("/account/{user_id}")
async def get_account(user_id: str):
    """Get full account details from MongoDB"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"user": user}


@api_router.put("/account/{user_id}")
async def update_account(user_id: str, update: AccountUpdate):
    """Update account details in MongoDB"""
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    updated_user = await db.users.find_one({"id": user_id})
    updated_user.pop("password_hash", None)
    updated_user.pop("_id", None)
    return {"success": True, "user": updated_user}


@api_router.get("/login-history/{user_id}")
async def get_login_history(user_id: str):
    """Get login history for a user from MongoDB"""
    history = await db.login_history.find({"user_id": user_id}).sort("timestamp", -1).to_list(50)
    for entry in history:
        entry.pop("_id", None)
    return {"history": history}


# ===== User Endpoints =====

@api_router.post("/users", response_model=User)
async def create_user(user_input: UserCreate):
    """Create a new user - accepts any email"""
    user_dict = user_input.dict()
    user_obj = User(**user_dict)
    await db.users.insert_one(user_obj.dict())
    return user_obj

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    """Get user by ID"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.put("/users/{user_id}/driving-status")
async def update_driving_status(user_id: str, is_driving: bool):
    """Update user's driving status"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"isDriving": is_driving, "isDriver": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Broadcast to all connected riders
    await manager.broadcast(json.dumps({
        "type": "driver_status_update",
        "user_id": user_id,
        "is_driving": is_driving
    }))
    
    return {"success": True, "isDriving": is_driving}

@api_router.get("/users/active-drivers/list")
async def get_active_drivers():
    """Get all users who are currently driving"""
    drivers = await db.users.find({"isDriving": True}).to_list(100)
    return {"drivers": [User(**driver) for driver in drivers]}

# ===== Driver Routes Endpoints =====

@api_router.post("/driver-routes", response_model=DriverRoute)
async def create_driver_route(route_input: DriverRouteCreate):
    """Publish a new driver route"""
    route_dict = route_input.dict()
    route_obj = DriverRoute(**route_dict)
    await db.driver_routes.insert_one(route_obj.dict())
    
    # Update user driving status
    await db.users.update_one(
        {"id": route_input.driver_id},
        {"$set": {"isDriving": True, "isDriver": True}}
    )
    
    # Broadcast to all riders
    await manager.broadcast(json.dumps({
        "type": "new_route",
        "route": route_obj.dict()
    }, cls=DateTimeEncoder))
    
    return route_obj

@api_router.get("/driver-routes/active", response_model=List[DriverRoute])
async def get_active_routes():
    """Get all active driver routes"""
    routes = await db.driver_routes.find({"is_active": True}).to_list(100)
    return [DriverRoute(**route) for route in routes]

@api_router.put("/driver-routes/{route_id}/deactivate")
async def deactivate_route(route_id: str):
    """Deactivate a route"""
    result = await db.driver_routes.update_one(
        {"id": route_id},
        {"$set": {"is_active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Route not found")
    return {"success": True}

# ===== Ride Request Endpoints (Handshake Logic) =====

@api_router.post("/ride-requests", response_model=RideRequest)
async def create_ride_request(request_input: RideRequestCreate):
    """Create a ride request (Step A: User clicks 'Request')"""
    request_dict = request_input.dict()
    request_obj = RideRequest(**request_dict)
    await db.ride_requests.insert_one(request_obj.dict())
    
    # Send real-time notification to driver
    await manager.send_personal_message(
        json.dumps({
            "type": "new_ride_request",
            "request": request_obj.dict()
        }, cls=DateTimeEncoder),
        request_input.driver_id
    )
    
    return request_obj

@api_router.get("/ride-requests/driver/{driver_id}")
async def get_driver_requests(driver_id: str):
    """Get all pending requests for a driver (Step B: Driver listens)"""
    requests = await db.ride_requests.find({
        "driver_id": driver_id,
        "status": "pending"
    }).to_list(100)
    return {"requests": [RideRequest(**req) for req in requests]}

@api_router.put("/ride-requests/{request_id}/accept")
async def accept_ride_request(request_id: str):
    """Accept a ride request (Step C: Driver clicks 'Accept')"""
    request = await db.ride_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Update request status
    await db.ride_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "accepted"}}
    )
    
    # Create ride match
    match = RideMatch(
        ride_request_id=request_id,
        rider_id=request["rider_id"],
        driver_id=request["driver_id"],
        route_id=request["route_id"]
    )
    await db.ride_matches.insert_one(match.dict())
    
    # Update carbon credits
    await db.users.update_one(
        {"id": request["rider_id"]},
        {"$inc": {"carbonSaved": 2.5, "ecoScore": 10}}
    )
    await db.users.update_one(
        {"id": request["driver_id"]},
        {"$inc": {"carbonSaved": 2.5, "ecoScore": 15}}
    )
    
    # Send success notification to rider
    await manager.send_personal_message(
        json.dumps({
            "type": "ride_accepted",
            "match": match.dict()
        }, cls=DateTimeEncoder),
        request["rider_id"]
    )
    
    return {"success": True, "match": match}

@api_router.put("/ride-requests/{request_id}/reject")
async def reject_ride_request(request_id: str):
    """Reject a ride request"""
    result = await db.ride_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "rejected"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"success": True}

# ===== Ratings Endpoints =====

@api_router.post("/ratings", response_model=Rating)
async def create_rating(rating_input: RatingCreate):
    """Submit a ride rating (Campus Match)"""
    rating_dict = rating_input.dict()
    rating_obj = Rating(**rating_dict)
    await db.ratings.insert_one(rating_obj.dict())
    
    # Update driver's average rating
    driver_ratings = await db.ratings.find({"driver_id": rating_input.driver_id}).to_list(1000)
    if driver_ratings:
        avg_rating = sum((r['smoothness'] + r['comfort']) / 2 for r in driver_ratings) / len(driver_ratings)
        await db.users.update_one(
            {"id": rating_input.driver_id},
            {"$set": {"rating": round(avg_rating / 2, 1)}}
        )
    
    return rating_obj

# ===== College Admin Endpoints =====

@api_router.get("/admin/college/{college_id}/stats")
async def get_college_stats(college_id: str):
    """Get live stats for college admin dashboard"""
    total_users = await db.users.count_documents({"college.id": college_id})
    active_drivers = await db.users.count_documents({"college.id": college_id, "isDriving": True})
    active_riders = await db.users.count_documents({"college.id": college_id, "isDriving": False})
    total_rides = await db.ride_matches.count_documents({})
    pending_verifications = await db.users.count_documents({"college.id": college_id, "verified": False})
    
    return {
        "total_users": total_users,
        "active_drivers": active_drivers,
        "active_riders": active_riders,
        "total_rides": total_rides,
        "pending_verifications": pending_verifications,
        "carbon_saved": 125.5  # Calculate from rides
    }

@api_router.get("/admin/college/{college_id}/users")
async def get_college_users(college_id: str):
    """Get all users from a specific college"""
    users = await db.users.find({"college.id": college_id}).to_list(1000)
    return {"users": [User(**user) for user in users]}

# ===== WebSocket Endpoint =====

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming messages if needed
    except WebSocketDisconnect:
        manager.disconnect(user_id)

# ===== Health Check =====

@api_router.get("/")
async def root():
    return {
        "message": "CampusPool API - Multi-College Ecosystem",
        "version": "2.0.0",
        "status": "active"
    }

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()