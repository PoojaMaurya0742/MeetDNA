from typing import Literal, Optional

from pydantic import BaseModel, Field


MemoryType = Literal["DECISION", "ACTION", "RISK", "INSIGHT", "CONTEXT", "ALL"]


class MemoryStoreRequest(BaseModel):
    strand: dict
    meeting_code: str
    meeting_title: str
    user_id: Optional[str] = None


class MemoryRecallRequest(BaseModel):
    query: str
    meeting_code: Optional[str] = None
    limit: int = Field(default=5, ge=1, le=50)


class MemoryStoreMeetingRequest(BaseModel):
    meeting_code: str


class MemoryObject(BaseModel):
    id: str
    type: str
    content: str
    source_meeting_code: str
    source_meeting_title: str
    speaker: Optional[str] = None
    keywords: list[str] = Field(default_factory=list)
    confidence: float = 0.0
    stored_at: str
    recall_count: int = 0
    user_id: str
