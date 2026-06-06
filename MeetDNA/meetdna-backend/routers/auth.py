import json
import time
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext

from models.user import AuthResponse, UserCreate, UserPublic, UserSignIn
from services.redis_service import redis_service
from utils.dependencies import get_current_user
from utils.jwt import create_token

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _debug_log(location: str, message: str, data: dict, hypothesis_id: str) -> None:
    try:
        with open(
            r"c:\Users\AKANKSHA N DAPHALE\Downloads\MeetDNA\debug-bff9bd.log",
            "a",
            encoding="utf-8",
        ) as f:
            f.write(
                json.dumps(
                    {
                        "sessionId": "bff9bd",
                        "location": location,
                        "message": message,
                        "data": data,
                        "timestamp": int(time.time() * 1000),
                        "hypothesisId": hypothesis_id,
                    }
                )
                + "\n"
            )
    except Exception:
        pass


def user_to_public(user: dict) -> UserPublic:
    return UserPublic(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        created_at=user.get("created_at"),
    )


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(body: UserCreate):
    try:
        existing = await redis_service.get_user(body.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        user = {
            "id": str(uuid4()),
            "name": body.name,
            "email": body.email,
            "password_hash": hash_password(body.password),
            "created_at": datetime.utcnow().isoformat(),
            "meetings": [],
        }
        await redis_service.save_user(user)
        token = create_token(user["id"])
        return AuthResponse(token=token, user=user_to_public(user))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup failed: {exc}",
        ) from exc


@router.post("/signin", response_model=AuthResponse)
async def signin(body: UserSignIn):
    try:
        user = await redis_service.get_user(body.email)
        user_found = user is not None
        has_hash = bool(user and user.get("password_hash"))
        verify_ok = False
        if user and has_hash:
            verify_ok = verify_password(body.password, user["password_hash"])
        # #region agent log
        _debug_log(
            "auth.py:signin",
            "signin lookup",
            {
                "email": body.email,
                "email_lower": body.email.lower(),
                "user_found": user_found,
                "has_password_hash": has_hash,
                "verify_ok": verify_ok,
                "stored_email": user.get("email") if user else None,
            },
            "A,B,C,E",
        )
        # #endregion
        if not user or not verify_ok:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )
        token = create_token(user["id"])
        return AuthResponse(token=token, user=user_to_public(user))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signin failed: {exc}",
        ) from exc


@router.get("/me", response_model=UserPublic)
async def me(current_user: dict = Depends(get_current_user)):
    return user_to_public(current_user)
