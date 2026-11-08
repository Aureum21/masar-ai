from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    phone_number = Column(String, nullable=True)
    nationality = Column(String, nullable=True)
    travel_preferences = Column(JSON, nullable=True)

class PreBooking(Base):
    __tablename__ = "pre_bookings"
    
    id = Column(Integer, primary_key=True, index=True)
    prebook_id = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(String, index=True, nullable=True)
    board_type = Column(String, nullable=True)
    final_price = Column(String, nullable=True)
    currency = Column(String, nullable=True)
    room_name = Column(String, nullable=True)
    checkin = Column(String, nullable=True)
    checkout = Column(String, nullable=True)
    status = Column(String, default="PENDING")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(Integer, primary_key=True, index=True)
    prebooking_id = Column(Integer, nullable=True) 
    user_id = Column(String, index=True, nullable=True)
    status = Column(String, default="CONFIRMED")
    checkin = Column(String, nullable=True)
    checkout = Column(String, nullable=True)
    hotel_info = Column(String, nullable=True) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Trip(Base):
    __tablename__ = "trips"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    title = Column(String, nullable=False)
    destination = Column(String, nullable=True)
    hero_image_url = Column(String, nullable=True)
    duration_days = Column(Integer, nullable=True)
    budget_tier = Column(String, nullable=True)
    vibes = Column(JSON, nullable=True)
    featured_hotel = Column(JSON, nullable=True)
    itinerary_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(String, primary_key=True, index=True) # UUID string from frontend
    user_id = Column(Integer, index=True, nullable=False)
    title = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(String, index=True, nullable=False)
    role = Column(String, nullable=False) # 'user' or 'ai'
    content = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Place(Base):
    __tablename__ = 'places'
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    aliases = Column(JSON, nullable=False, default=list)


class Attraction(Base):
    __tablename__ = 'attractions'
    id = Column(String(120), primary_key=True)
    name = Column(String(240), nullable=False)
    emirate = Column(String(24), nullable=False, index=True)
    kind = Column(String(24), nullable=False)
    data = Column(JSON, nullable=False)


class TripBriefRecord(Base):
    __tablename__ = 'trip_briefs'
    __table_args__ = (UniqueConstraint('user_id',name='uq_trip_brief_owner'),CheckConstraint('revision >= 1',name='ck_trip_brief_revision'))
    id = Column(String,primary_key=True)
    user_id = Column(Integer,ForeignKey('users.id',ondelete='CASCADE'),nullable=False)
    payload = Column(JSON,nullable=False)
    revision = Column(Integer,nullable=False,default=1,server_default='1')
    created_at = Column(DateTime(timezone=True),nullable=False,server_default=func.now())
    updated_at = Column(DateTime(timezone=True),nullable=False,server_default=func.now())


class PlanningRun(Base):
    __tablename__ = 'planning_runs'
    __table_args__ = (UniqueConstraint('user_id','request_id',name='uq_planning_request'),
        CheckConstraint("status IN ('queued','running','completed','failed','interrupted','cancelled')",name='ck_planning_status'),
        CheckConstraint('attempts >= 0 AND attempts <= 3',name='ck_planning_attempts'))
    id = Column(String,primary_key=True)
    user_id = Column(Integer,ForeignKey('users.id',ondelete='CASCADE'),nullable=False,index=True)
    brief_id = Column(String,nullable=False)
    brief_revision = Column(Integer,nullable=False)
    brief_snapshot = Column(JSON,nullable=False)
    request_id = Column(String,nullable=False)
    request_hash = Column(String,nullable=False)
    status = Column(String,nullable=False,index=True)
    attempts = Column(Integer,nullable=False,default=0,server_default='0')
    progress = Column(JSON,nullable=False,default=list)
    workers = Column(JSON,nullable=False,default=list)
    message = Column(String,nullable=False)
    response = Column(String,nullable=True)
    trip_id = Column(Integer,ForeignKey('trips.id',ondelete='SET NULL'),nullable=True)
    lease_token = Column(String,nullable=True)
    lease_expires_at = Column(DateTime(timezone=True),nullable=True)
    created_at = Column(DateTime(timezone=True),nullable=False,server_default=func.now())
    updated_at = Column(DateTime(timezone=True),nullable=False,server_default=func.now())

# Registered on the shared migration metadata; no startup schema creation.
from receipts.models import Receipt as TravelReceipt
