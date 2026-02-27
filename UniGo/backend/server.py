from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ===== Models =====

class College(BaseModel):
    id: str
    name: str
    short: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    college: College
    ecoScore: int = 0
    verified: bool = True
    isDriver: bool = False
    collegeEmail: Optional[str] = None
    driverStatus: str = "none"  # none, pending, approved
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    name: str
    email: str
    college: College

class DriverRoute(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    driver_id: str
    driver_name: str
    origin: str
    destination: str
    departure_time: str
    available_seats: int = 4
    amenities: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DriverRouteCreate(BaseModel):
    driver_id: str
    driver_name: str
    origin: str
    destination: str
    departure_time: str
    available_seats: int = 4
    amenities: List[str] = []

class RideRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rider_id: str
    rider_name: str
    college_id: str
    from_location: str
    to_location: str
    rider_lat: float
    rider_lng: float
    time: str
    riders_count: int = 1
    tokens: int
    status: str = "pending"  # pending, accepted, completed
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RideRequestCreate(BaseModel):
    rider_id: str
    rider_name: str
    college_id: str
    from_location: str
    to_location: str
    rider_lat: float
    rider_lng: float
    time: str
    riders_count: int = 1
    tokens: int

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ride_id: str
    sender_id: str
    sender_name: str
    text: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChatMessageCreate(BaseModel):
    ride_id: str
    sender_id: str
    sender_name: str
    text: str

class Rating(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ride_id: str
    rider_id: str
    driver_id: str
    smoothness: int  # 1-10
    comfort: int  # 1-10
    amenities: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RatingCreate(BaseModel):
    ride_id: str
    rider_id: str
    driver_id: str
    smoothness: int
    comfort: int
    amenities: List[str] = []

class Subscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    tier_name: str
    price: int
    rides_remaining: int
    validity: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SubscriptionCreate(BaseModel):
    user_id: str
    tier_name: str
    price: int
    rides_remaining: int
    validity: str

# ===== User Endpoints =====

@api_router.post("/users", response_model=User)
async def create_user(user_input: UserCreate):
    """Create a new user"""
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

@api_router.get("/users", response_model=List[User])
async def get_users():
    """Get all users"""
    users = await db.users.find().to_list(1000)
    return [User(**user) for user in users]

@api_router.put("/users/{user_id}/eco-score")
async def update_eco_score(user_id: str, eco_score: int):
    """Update user's eco score"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"ecoScore": eco_score}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "ecoScore": eco_score}

class DriverOnboardInput(BaseModel):
    name: str
    email: str
    college: College
    collegeEmail: str
    vehicleDetails: Optional[str] = None

@api_router.put("/users/{user_id}/onboard-driver")
async def onboard_driver(user_id: str, onboard_data: DriverOnboardInput):
    """Onboard a user as a driver, creating the user if they don't exist"""
    user_data = {
        "id": user_id,
        "name": onboard_data.name,
        "email": onboard_data.email,
        "college": onboard_data.college.dict(),
        "isDriver": True,
        "collegeEmail": onboard_data.collegeEmail,
        "driverStatus": "approved",
        "vehicleDetails": onboard_data.vehicleDetails,
        "ecoScore": 0,
        "verified": True
    }
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": user_data},
        upsert=True
    )
    return {"success": True}

# ===== Driver Routes Endpoints =====

@api_router.post("/driver-routes", response_model=DriverRoute)
async def create_driver_route(route_input: DriverRouteCreate):
    """Publish a new driver route"""
    route_dict = route_input.dict()
    route_obj = DriverRoute(**route_dict)
    await db.driver_routes.insert_one(route_obj.dict())
    return route_obj

@api_router.get("/driver-routes", response_model=List[DriverRoute])
async def get_driver_routes():
    """Get all available driver routes"""
    routes = await db.driver_routes.find().to_list(1000)
    return [DriverRoute(**route) for route in routes]

@api_router.get("/driver-routes/{driver_id}", response_model=List[DriverRoute])
async def get_driver_routes_by_driver(driver_id: str):
    """Get routes published by a specific driver"""
    routes = await db.driver_routes.find({"driver_id": driver_id}).to_list(1000)
    return [DriverRoute(**route) for route in routes]

@api_router.delete("/driver-routes/{route_id}")
async def delete_driver_route(route_id: str):
    """Delete a driver route"""
    result = await db.driver_routes.delete_one({"id": route_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Route not found")
    return {"success": True}

# ===== Ride Requests Endpoints =====

@api_router.post("/ride-requests", response_model=RideRequest)
async def create_ride_request(request_input: RideRequestCreate):
    """Create a new ride request"""
    request_dict = request_input.dict()
    request_obj = RideRequest(**request_dict)
    await db.ride_requests.insert_one(request_obj.dict())
    return request_obj

@api_router.get("/ride-requests", response_model=List[RideRequest])
async def get_ride_requests(status: Optional[str] = None, college_id: Optional[str] = None, rider_id: Optional[str] = None):
    """Get all ride requests, optionally filtered by status, college_id, and rider_id"""
    query = {}
    if status:
        query["status"] = status
    if college_id:
        query["college_id"] = college_id
    if rider_id:
        query["rider_id"] = rider_id
    
    requests = await db.ride_requests.find(query).to_list(1000)
    return [RideRequest(**req) for req in requests]

class AcceptRideRequest(BaseModel):
    driver_id: str
    driver_name: str

@api_router.put("/ride-requests/{request_id}/accept")
async def accept_ride_request(request_id: str, accept_input: AcceptRideRequest):
    """Accept a ride request"""
    # 1. Update the ride request status
    result = await db.ride_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "accepted", 
            "driver_id": accept_input.driver_id,
            "driver_name": accept_input.driver_name
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ride request not found")
    
    # 2. Automatically send a chat message from the driver
    auto_message = ChatMessage(
        ride_id=request_id,
        sender_id=accept_input.driver_id,
        sender_name=accept_input.driver_name,
        text="I have accepted your request and I'm on my way!"
    )
    await db.chats.insert_one(auto_message.dict())
    
    return {"success": True}

@api_router.put("/ride-requests/{request_id}/complete")
async def complete_ride_request(request_id: str):
    """Mark ride request as completed"""
    result = await db.ride_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "completed"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ride request not found")
    return {"success": True}

# ===== Ratings Endpoints =====

@api_router.post("/ratings", response_model=Rating)
async def create_rating(rating_input: RatingCreate):
    """Submit a ride rating"""
    rating_dict = rating_input.dict()
    rating_obj = Rating(**rating_dict)
    await db.ratings.insert_one(rating_obj.dict())
    
    # Update driver's average rating
    driver_ratings = await db.ratings.find({"driver_id": rating_input.driver_id}).to_list(1000)
    if driver_ratings:
        avg_rating = sum((r['smoothness'] + r['comfort']) / 2 for r in driver_ratings) / len(driver_ratings)
        await db.users.update_one(
            {"id": rating_input.driver_id},
            {"$set": {"rating": round(avg_rating / 2, 1)}}  # Scale to 5-star
        )
    
    return rating_obj

@api_router.get("/ratings/driver/{driver_id}", response_model=List[Rating])
async def get_driver_ratings(driver_id: str):
    """Get all ratings for a driver"""
    ratings = await db.ratings.find({"driver_id": driver_id}).to_list(1000)
    return [Rating(**rating) for rating in ratings]

# ===== Chat Endpoints =====

@api_router.post("/chats", response_model=ChatMessage)
async def send_chat_message(message_input: ChatMessageCreate):
    """Send a new chat message"""
    message_dict = message_input.dict()
    message_obj = ChatMessage(**message_dict)
    await db.chats.insert_one(message_obj.dict())
    return message_obj

@api_router.get("/chats/{ride_id}", response_model=List[ChatMessage])
async def get_chat_messages(ride_id: str):
    """Get all messages for a specific ride"""
    messages = await db.chats.find({"ride_id": ride_id}).sort("created_at", 1).to_list(1000)
    return [ChatMessage(**msg) for msg in messages]

# ===== Subscriptions Endpoints =====

@api_router.post("/subscriptions", response_model=Subscription)
async def create_subscription(sub_input: SubscriptionCreate):
    """Create a new subscription"""
    sub_dict = sub_input.dict()
    sub_obj = Subscription(**sub_dict)
    await db.subscriptions.insert_one(sub_obj.dict())
    return sub_obj

@api_router.get("/subscriptions/{user_id}", response_model=List[Subscription])
async def get_user_subscriptions(user_id: str):
    """Get subscriptions for a user"""
    subscriptions = await db.subscriptions.find({"user_id": user_id}).to_list(1000)
    return [Subscription(**sub) for sub in subscriptions]

# ===== Health Check =====

@api_router.get("/")
async def root():
    return {
        "message": "CampusPool API",
        "version": "1.0.0",
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
