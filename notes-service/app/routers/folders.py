import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.note import Folder
from app.schemas.note import FolderCreate, FolderOut

router = APIRouter(prefix="/folders", tags=["folders"])


@router.get("/", response_model=list[FolderOut])
async def list_folders(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Folder).where(Folder.user_id == user["id"]))
    return result.scalars().all()


@router.post("/", response_model=FolderOut, status_code=status.HTTP_201_CREATED)
async def create_folder(
    payload: FolderCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    if payload.parent_id:
        parent = await db.get(Folder, payload.parent_id)
        if not parent or parent.user_id != user["id"]:
            raise HTTPException(status_code=404, detail="Parent folder not found")

    folder = Folder(user_id=user["id"], name=payload.name, parent_id=payload.parent_id)
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return folder


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(
    folder_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    folder = await db.get(Folder, folder_id)
    if not folder or folder.user_id != user["id"]:
        raise HTTPException(status_code=404, detail="Folder not found")
    await db.delete(folder)
    await db.commit()
