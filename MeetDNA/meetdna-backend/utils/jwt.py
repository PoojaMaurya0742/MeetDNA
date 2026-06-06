import os
from datetime import datetime, timedelta

from jose import JWTError, jwt

SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
ALGO = "HS256"


def create_token(user_id: str) -> str:
    expire_hours = int(os.getenv("JWT_EXPIRE_HOURS", "24"))
    expire = datetime.utcnow() + timedelta(hours=expire_hours)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET, algorithm=ALGO)


def decode_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGO])
        return payload.get("sub")
    except JWTError:
        return None
