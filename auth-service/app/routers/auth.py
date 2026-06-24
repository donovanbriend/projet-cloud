import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import create_access_token, decode_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import Token, TokenPayload, UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer()


async def _get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = decode_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    result = await db.execute(select(User).where(User.id == uuid.UUID(payload["sub"])))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    if (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    if (await db.execute(select(User).where(User.username == payload.username))).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(email=payload.email, username=payload.username, password_hash=hash_password(payload.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=Token)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return Token(access_token=create_access_token(str(user.id), user.email, user.username))


@router.post("/verify", response_model=TokenPayload)
async def verify_token(body: dict):
    token = body.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Token required")
    try:
        payload = decode_token(token)
        return TokenPayload(sub=payload["sub"], email=payload["email"], username=payload["username"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(_get_current_user)):
    return current_user
