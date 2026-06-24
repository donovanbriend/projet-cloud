import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.note import Note, Share, Tag
from app.schemas.note import NoteCreate, NoteOut, NoteUpdate, ShareCreate, ShareOut

router = APIRouter(prefix="/notes", tags=["notes"])


async def _load_note(note_id: uuid.UUID, db: AsyncSession) -> Note:
    result = await db.execute(
        select(Note).where(Note.id == note_id).options(selectinload(Note.tags), selectinload(Note.shares))
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


def _can_read(note: Note, user_id: uuid.UUID) -> bool:
    if note.user_id == user_id:
        return True
    return any(s.shared_with_id == user_id for s in note.shares)


def _can_write(note: Note, user_id: uuid.UUID) -> bool:
    if note.user_id == user_id:
        return True
    return any(s.shared_with_id == user_id and s.permission == "write" for s in note.shares)


@router.get("/", response_model=list[NoteOut])
async def list_notes(
    folder_id: uuid.UUID | None = None,
    tag_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    query = (
        select(Note)
        .where(or_(Note.user_id == user["id"], Note.shares.any(Share.shared_with_id == user["id"])))
        .options(selectinload(Note.tags), selectinload(Note.shares))
    )
    if folder_id:
        query = query.where(Note.folder_id == folder_id)
    if tag_id:
        query = query.where(Note.tags.any(Tag.id == tag_id))

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
async def create_note(
    payload: NoteCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    tags = []
    for tag_id in payload.tag_ids:
        tag = await db.get(Tag, tag_id)
        if not tag or tag.user_id != user["id"]:
            raise HTTPException(status_code=404, detail=f"Tag {tag_id} not found")
        tags.append(tag)

    note = Note(
        user_id=user["id"],
        title=payload.title,
        content=payload.content,
        folder_id=payload.folder_id,
        tags=tags,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return await _load_note(note.id, db)


@router.get("/{note_id}", response_model=NoteOut)
async def get_note(
    note_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    note = await _load_note(note_id, db)
    if not _can_read(note, user["id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    return note


@router.patch("/{note_id}", response_model=NoteOut)
async def update_note(
    note_id: uuid.UUID,
    payload: NoteUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    note = await _load_note(note_id, db)
    if not _can_write(note, user["id"]):
        raise HTTPException(status_code=403, detail="Access denied")

    if payload.title is not None:
        note.title = payload.title
    if payload.content is not None:
        note.content = payload.content
    if payload.folder_id is not None:
        note.folder_id = payload.folder_id
    if payload.tag_ids is not None:
        tags = []
        for tag_id in payload.tag_ids:
            tag = await db.get(Tag, tag_id)
            if not tag or tag.user_id != note.user_id:
                raise HTTPException(status_code=404, detail=f"Tag {tag_id} not found")
            tags.append(tag)
        note.tags = tags

    await db.commit()
    return await _load_note(note_id, db)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    note = await _load_note(note_id, db)
    if note.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Only the owner can delete a note")
    await db.delete(note)
    await db.commit()


@router.post("/{note_id}/shares", response_model=ShareOut, status_code=status.HTTP_201_CREATED)
async def share_note(
    note_id: uuid.UUID,
    payload: ShareCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    note = await _load_note(note_id, db)
    if note.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Only the owner can share a note")
    if payload.shared_with_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot share with yourself")

    share = Share(
        note_id=note_id,
        owner_id=user["id"],
        shared_with_id=payload.shared_with_id,
        permission=payload.permission,
    )
    db.add(share)
    await db.commit()
    await db.refresh(share)
    return share


@router.delete("/{note_id}/shares/{share_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_share(
    note_id: uuid.UUID,
    share_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    share = await db.get(Share, share_id)
    if not share or share.note_id != note_id or share.owner_id != user["id"]:
        raise HTTPException(status_code=404, detail="Share not found")
    await db.delete(share)
    await db.commit()
