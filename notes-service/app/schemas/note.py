import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class FolderCreate(BaseModel):
    name: str
    parent_id: uuid.UUID | None = None


class FolderOut(BaseModel):
    id: uuid.UUID
    name: str
    parent_id: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TagCreate(BaseModel):
    name: str


class TagOut(BaseModel):
    id: uuid.UUID
    name: str

    model_config = {"from_attributes": True}


class NoteCreate(BaseModel):
    title: str
    content: str = ""
    folder_id: uuid.UUID | None = None
    tag_ids: list[uuid.UUID] = []


class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    folder_id: uuid.UUID | None = None
    tag_ids: list[uuid.UUID] | None = None


class NoteOut(BaseModel):
    id: uuid.UUID
    title: str
    content: str
    folder_id: uuid.UUID | None
    tags: list[TagOut]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ShareCreate(BaseModel):
    shared_with_id: uuid.UUID
    permission: Literal["read", "write"] = "read"


class ShareOut(BaseModel):
    id: uuid.UUID
    note_id: uuid.UUID
    shared_with_id: uuid.UUID
    permission: str
    created_at: datetime

    model_config = {"from_attributes": True}
