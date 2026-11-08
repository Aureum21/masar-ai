from pydantic import BaseModel, EmailStr, field_validator, model_validator, Field
from datetime import datetime, date
from domain.preferences import normalise_preferences
from domain.trips import normalise_itinerary
from typing import Dict, Any, Optional, Literal

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: datetime
    phone_number: str | None = None
    nationality: str | None = None
    travel_preferences: Dict[str, Any] | None = None
    access_token: str | None = None

    class Config:
        from_attributes = True

    @field_validator("travel_preferences", mode="before")
    @classmethod
    def preferences(cls, value):
        return normalise_preferences(value) if value else value

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None

class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone_number: str | None = None
    nationality: str | None = None
    travel_preferences: Dict[str, Any] | None = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class UpdatePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class TripCreate(BaseModel):
    title: str
    destination: str | None = None
    hero_image_url: str | None = None
    duration_days: int | None = None
    budget_tier: str | None = None
    vibes: list[str] | None = None
    featured_hotel: Dict[str, Any] | None = None
    itinerary_data: dict | list | str
    start_date: date | None = None
    end_date: date | None = None

    @model_validator(mode="after")
    def itinerary(self):
        from uuid import uuid4
        self.itinerary_data = normalise_itinerary(self.itinerary_data, trip_id=str(uuid4()), start_date=self.start_date, end_date=self.end_date)
        return self

class TripUpdate(BaseModel):
    title: str | None = None
    destination: str | None = None
    hero_image_url: str | None = None
    duration_days: int | None = None
    budget_tier: str | None = None
    vibes: list[str] | None = None
    featured_hotel: Dict[str, Any] | None = None
    itinerary_data: dict | list | str | None = None
    status: Literal["draft", "active", "completed", "archived", "cancelled"] | None = None
    expected_revision: int | None = Field(default=None, ge=1)

class TripResponse(BaseModel):
    id: int
    user_id: int
    title: str
    destination: str | None = None
    hero_image_url: str | None = None
    duration_days: int | None = None
    budget_tier: str | None = None
    vibes: list[str] | None = None
    featured_hotel: Dict[str, Any] | None = None
    itinerary_data: dict | list | str
    created_at: datetime
    start_date: date | None = None
    end_date: date | None = None
    timezone: str = "Asia/Dubai"
    status: str = "draft"
    revision: int = 1
    challenges_enabled: bool = False
    reservations: list[dict] = Field(default_factory=list)

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def itinerary(self):
        self.itinerary_data = normalise_itinerary(self.itinerary_data, trip_id=self.id)
        for key in ["start_date", "end_date"]:
            value = self.itinerary_data.get(key)
            setattr(self, key, date.fromisoformat(value) if value else None)
        for key in ["timezone", "status", "revision"]:
            setattr(self, key, self.itinerary_data[key])
        return self

class MessageResponse(BaseModel):
    id: int
    conversation_id: str
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    id: str
    user_id: int
    title: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class GuestSchema(BaseModel):
    firstName: str
    lastName: str

class HolderSchema(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    phone: str

class ConfirmBookingRequest(BaseModel):
    prebook_id: str
    holder: HolderSchema
    guests: list[GuestSchema]
    payment_method: str = "ACC_CREDIT_CARD"
