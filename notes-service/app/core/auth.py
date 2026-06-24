import uuid

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    token = credentials.credentials
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{settings.AUTH_SERVICE_URL}/auth/verify",
                json={"token": token},
                timeout=5.0,
            )
        except httpx.RequestError:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Auth service unreachable")

    if resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    data = resp.json()
    return {"id": uuid.UUID(data["sub"]), "email": data["email"], "username": data["username"]}
