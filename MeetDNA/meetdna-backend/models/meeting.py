from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


MeetingStatus = Literal["waiting", "active", "ended"]


class Participant(BaseModel):
    id: str
    name: str
    joined_at: str
    is_muted: bool = False
    is_video_off: bool = False
    is_speaking: bool = False


class TranscriptLine(BaseModel):
    id: str
    speaker: str
    speaker_id: str
    text: str
    timestamp: str
    words: Optional[list[Any]] = None
    is_final: bool = True


class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    topic: str = Field(default="", max_length=500)
    password_enabled: bool = False
    password: Optional[str] = None
    max_participants: int = Field(default=50, ge=2, le=500)


class MeetingJoin(BaseModel):
    code: str
    password: Optional[str] = None
    participant_name: str = Field(..., min_length=1, max_length=100)
    participant_id: Optional[str] = None


class MeetingCreateResponse(BaseModel):
    meeting_code: str
    meeting_id: str
    join_link: str


class MeetingJoinResponse(BaseModel):
    meeting: dict[str, Any]
    participant_id: str

class TranscriptAppendRequest(BaseModel):
    text: str
    speaker: Optional[str] = "Host"