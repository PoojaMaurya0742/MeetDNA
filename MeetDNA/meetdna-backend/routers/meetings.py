from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel
from typing import List,Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext

from models.meeting import MeetingCreate, MeetingCreateResponse, MeetingJoin, MeetingJoinResponse
from services.redis_service import redis_service
from services.summary_service import generate_and_store_summary
from utils.code_generator import generate_meeting_code
from utils.dependencies import get_current_user, get_current_user_id

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def sanitize_meeting(meeting: dict) -> dict:
    sanitized = dict(meeting)
    sanitized.pop("password", None)
    return sanitized


class TranscriptAppendRequest(BaseModel):
    text: str
    speaker: Optional[str] = "Host"


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


def _split_to_lines(text: str, speaker: str) -> List[dict]:
    """
    Split pasted text on newlines.
    Each non-empty line becomes a transcript entry compatible with
    what run_extraction() expects: { id, speaker, text, timestamp, is_final }.
    """
    lines = []
    for raw in text.splitlines():
        stripped = raw.strip()
        if not stripped:
            continue

        # Allow inline speaker prefix: "Alice: some text"
        if ":" in stripped and not stripped.startswith("http"):
            prefix, _, rest = stripped.partition(":")
            if len(prefix.split()) <= 3 and rest.strip():
                # Looks like a speaker prefix
                lines.append({
                    "id": str(uuid.uuid4()),
                    "speaker": prefix.strip(),
                    "text": rest.strip(),
                    "timestamp": _now_iso(),
                    "is_final": True,
                })
                continue

        lines.append({
            "id": str(uuid.uuid4()),
            "speaker": speaker,
            "text": stripped,
            "timestamp": _now_iso(),
            "is_final": True,
        })
    return lines


@router.post("/create", response_model=MeetingCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    body: MeetingCreate,
    user_id: str = Depends(get_current_user_id),
):
    try:
        code = generate_meeting_code()
        while await redis_service.get_meeting(code):
            code = generate_meeting_code()

        password_hash = None
        if body.password_enabled and body.password:
            password_hash = pwd_context.hash(body.password)

        meeting = {
            "id": str(uuid4()),
            "code": code,
            "title": body.title,
            "topic": body.topic,
            "host_id": user_id,
            "password": password_hash,
            "password_enabled": body.password_enabled,
            "max_participants": body.max_participants,
            "participants": [],
            "transcript": [],
            "dna_strands": [],
            "agenda": [],
            "action_items": [],
            "status": "waiting",
            "created_at": datetime.utcnow().isoformat(),
            "started_at": None,
            "ended_at": None,
            "duration_seconds": 0,
            "summary": None,
            "meeting_score": 0,
            "transcript_since_last_extraction": 0,
        }
        await redis_service.save_meeting(code, meeting)

        user = await redis_service.get_user_by_id(user_id)
        if user:
            meetings_list = user.get("meetings", [])
            if code not in meetings_list:
                meetings_list.append(code)
            user["meetings"] = meetings_list
            await redis_service.save_user(user)

        return MeetingCreateResponse(
            meeting_code=code,
            meeting_id=meeting["id"],
            join_link=f"/meeting/{code}",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create meeting: {exc}",
        ) from exc


@router.post("/join", response_model=MeetingJoinResponse)
async def join_meeting(body: MeetingJoin):
    try:
        meeting = await redis_service.get_meeting(body.code)
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meeting not found",
            )

        if meeting.get("password_enabled"):
            stored = meeting.get("password")
            if not stored or not body.password or not pwd_context.verify(body.password, stored):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid meeting password",
                )

        if meeting.get("status") == "ended":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Meeting has ended",
            )

        participant_id = body.participant_id or str(uuid4())
        participant = {
            "id": participant_id,
            "name": body.participant_name,
            "joined_at": datetime.utcnow().isoformat(),
            "is_muted": False,
            "is_video_off": False,
            "is_speaking": False,
        }

        existing_ids = {p["id"] for p in meeting.get("participants", [])}
        if participant_id not in existing_ids:
            if len(meeting.get("participants", [])) >= meeting.get("max_participants", 50):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Meeting is full",
                )
            meeting["participants"].append(participant)

        if meeting.get("status") == "waiting":
            meeting["status"] = "active"
            meeting["started_at"] = datetime.utcnow().isoformat()

        await redis_service.save_meeting(body.code, meeting)

        return MeetingJoinResponse(
            meeting=sanitize_meeting(meeting),
            participant_id=participant_id,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to join meeting: {exc}",
        ) from exc


@router.get("/history")
async def meeting_history(current_user: dict = Depends(get_current_user)):
    try:
        meetings: list[dict] = []
        for code in current_user.get("meetings", []):
            meeting = await redis_service.get_meeting(code)
            if meeting:
                meetings.append(sanitize_meeting(meeting))
        meetings.sort(key=lambda m: m.get("created_at", ""), reverse=True)
        return {"meetings": meetings, "total": len(meetings)}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch meeting history: {exc}",
        ) from exc


@router.get("/{code}")
async def get_meeting(code: str, current_user: dict = Depends(get_current_user)):
    try:
        meeting = await redis_service.get_meeting(code)
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meeting not found",
            )
        return sanitize_meeting(meeting)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch meeting: {exc}",
        ) from exc

@router.post("/{code}/transcript")
async def append_transcript(
    code: str,
    body: TranscriptAppendRequest,
    current_user: dict = Depends(get_current_user),
):
    meeting = await redis_service.get_meeting(code)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if meeting.get("status") == "ended":
        raise HTTPException(status_code=400, detail="Cannot append to ended meeting")

    speaker = body.speaker or current_user.get("name") or "Host"
    new_lines = _split_to_lines(body.text, speaker)
    if not new_lines:
        raise HTTPException(status_code=400, detail="No text to add")

    meeting.setdefault("transcript", []).extend(new_lines)
    meeting["transcript_since_last_extraction"] = (
        meeting.get("transcript_since_last_extraction", 0) + len(new_lines)
    )
    await redis_service.save_meeting(code, meeting)
    return {"lines_added": len(new_lines), "transcript": meeting["transcript"]}

@router.post("/{code}/end")
async def end_meeting(
    code: str,
    user_id: str = Depends(get_current_user_id),
):
    try:
        meeting = await redis_service.get_meeting(code)
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meeting not found",
            )

        if meeting.get("host_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the host can end the meeting",
            )

        now = datetime.utcnow()
        meeting["status"] = "ended"
        meeting["ended_at"] = now.isoformat()

        if meeting.get("started_at"):
            started = datetime.fromisoformat(meeting["started_at"])
            meeting["duration_seconds"] = int((now - started).total_seconds())

        summary = await generate_and_store_summary(code, user_id, disconnect=True)
        meeting = await redis_service.get_meeting(code) or meeting

        return {"summary": summary, "meeting": sanitize_meeting(meeting)}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to end meeting: {exc}",
        ) from exc

