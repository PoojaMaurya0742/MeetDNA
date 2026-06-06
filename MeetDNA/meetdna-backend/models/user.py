from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class UserSignIn(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    name: str
    email: str
    created_at: Optional[str] = None


class UserInRedis(BaseModel):
    id: str
    name: str
    email: str
    password_hash: str
    created_at: str
    meetings: list[str] = Field(default_factory=list)


class AuthResponse(BaseModel):
    token: str
    user: UserPublic
