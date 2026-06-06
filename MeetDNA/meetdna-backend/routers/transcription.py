import logging
from datetime import datetime
from uuid import uuid4

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    status,
)

from services.connection_manager import connection_manager
from services.extraction_service import EXTRACTION_THRESHOLD, run_extraction
from services.groq_service import groq_service
from services.redis_service import redis_service
from services.whisper_service import whisper_service
from utils.dependencies import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter()


async def _maybe_trigger_extraction(
    meeting_code: str, user_id: str, background_tasks: BackgroundTasks
) -> None:
    meeting = await redis_service.get_meeting(meeting_code)
    if not meeting:
        return
    count = meeting.get("transcript_since_last_extraction", 0)
    if count >= EXTRACTION_THRESHOLD:
        background_tasks.add_task(run_extraction, meeting_code, user_id)


@router.post("/chunk")
async def transcribe_chunk(
    background_tasks: BackgroundTasks,
    audio_chunk: UploadFile = File(...),
    meeting_code: str = Form(...),
    speaker_name: str = Form(...),
    speaker_id: str = Form(...),
    user_id: str = Depends(get_current_user_id),
):
    try:
        meeting = await redis_service.get_meeting(meeting_code)
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meeting not found",
            )

        audio_bytes = await audio_chunk.read()
        if not audio_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty audio chunk",
            )

        transcription = await whisper_service.transcribe_chunk(
            audio_bytes,
            filename=audio_chunk.filename or "audio.webm",
        )

        raw_text = (transcription.get("text") or "").strip()
        if not raw_text:
            return {"transcript_line": None, "filtered": True, "is_important": False}

        try:
            filtered = await groq_service.filter_transcript(raw_text, speaker_name)
        except Exception:
            lowered = raw_text.lower().strip()
            noise = {"hi", "hello", "hey", "ok", "okay", "thanks", "thank you", "bye", "good morning", "good evening"}
            if lowered in noise or len(lowered) < 4:
                return {"transcript_line": None, "filtered": True, "is_important": False, "raw_text": raw_text}
            filtered = {"is_important": True, "filtered_text": raw_text.strip()}

        if not filtered.get("is_important") or not filtered.get("filtered_text", "").strip():
            return {
                "transcript_line": None,
                "filtered": True,
                "is_important": False,
                "raw_text": raw_text,
            }

        transcript_line = {
            "id": str(uuid4()),
            "speaker": speaker_name,
            "speaker_id": speaker_id,
            "text": filtered.get("filtered_text", raw_text).strip(),
            "raw_text": raw_text,
            "timestamp": datetime.utcnow().isoformat(),
            "words": transcription.get("words", []),
            "is_final": True,
        }

        meeting.setdefault("transcript", []).append(transcript_line)
        meeting["transcript_since_last_extraction"] = meeting.get("transcript_since_last_extraction", 0) + 1
        await redis_service.save_meeting(meeting_code, meeting)

        ws_message = connection_manager.build_message(
            "transcript_line",
            {"transcript_line": transcript_line},
            sender_id=speaker_id,
            meeting_code=meeting_code,
        )
        await connection_manager.broadcast_to_room(meeting_code, ws_message)

        await _maybe_trigger_extraction(meeting_code, user_id, background_tasks)

        return {"transcript_line": transcript_line}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Transcription failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failed: {exc}",
        ) from exc


@router.websocket("/stream")
async def transcription_stream(websocket: WebSocket):
    """WebSocket streaming transcription — receives audio bytes, returns partial text."""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_bytes()
            if not data:
                continue
            try:
                transcription = await whisper_service.transcribe_chunk(data)
                await websocket.send_json(
                    {
                        "text": transcription.get("text", ""),
                        "words": transcription.get("words", []),
                        "is_final": True,
                    }
                )
            except Exception as exc:
                await websocket.send_json({"error": str(exc), "is_final": False})
    except WebSocketDisconnect:
        logger.info("Transcription stream disconnected")
    except Exception as exc:
        logger.error("Transcription stream error: %s", exc)
