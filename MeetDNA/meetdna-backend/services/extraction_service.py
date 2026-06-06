import logging
from datetime import datetime
from uuid import uuid4

from services.connection_manager import connection_manager
from services.groq_service import groq_service
from services.hindsight_service import hindsight_service
from services.redis_service import redis_service

logger = logging.getLogger(__name__)

EXTRACTION_THRESHOLD = 8
HIGH_CONFIDENCE_THRESHOLD = 0.85


async def run_extraction(meeting_code: str, user_id: str) -> dict:
    meeting = await redis_service.get_meeting(meeting_code)
    if not meeting:
        return {"new_strands": [], "total_strands": 0}

    transcript_lines = meeting.get("transcript", [])
    if not transcript_lines:
        return {"new_strands": [], "total_strands": len(meeting.get("dna_strands", []))}

    recent_lines = transcript_lines[-EXTRACTION_THRESHOLD:]
    transcript_chunk = "\n".join(
        f"{line['speaker']}: {line['text']}" for line in recent_lines
    )
    existing_dna = meeting.get("dna_strands", [])

    try:
        result = await groq_service.extract_dna(transcript_chunk, existing_dna)
    except Exception as exc:
        logger.error("DNA extraction failed: %s", exc)
        raise

    new_strands: list[dict] = []
    for strand in result.get("strands", []):
        enriched = {
            **strand,
            "id": str(uuid4()),
            "meeting_code": meeting_code,
            "extracted_at": datetime.utcnow().isoformat(),
            "stored_to_hindsight": False,
        }
        meeting["dna_strands"].append(enriched)
        new_strands.append(enriched)

        if enriched.get("type") == "RISK":
            msg = connection_manager.build_message(
                "risk_alert",
                {"strand": enriched},
                sender_id="system",
                meeting_code=meeting_code,
            )
            await connection_manager.broadcast_to_room(meeting_code, msg)

        if enriched.get("type") == "ACTION":
            msg = connection_manager.build_message(
                "action_detected",
                {"strand": enriched},
                sender_id="system",
                meeting_code=meeting_code,
            )
            await connection_manager.broadcast_to_room(meeting_code, msg)

        confidence = enriched.get("confidence", 0.0)
        if confidence > HIGH_CONFIDENCE_THRESHOLD:
            await hindsight_service.store_memory(
                strand=enriched,
                meeting_code=meeting_code,
                meeting_title=meeting.get("title", ""),
                user_id=user_id,
            )
            enriched["stored_to_hindsight"] = True

    meeting["transcript_since_last_extraction"] = 0
    await redis_service.save_meeting(meeting_code, meeting)

    return {
        "new_strands": new_strands,
        "total_strands": len(meeting.get("dna_strands", [])),
    }
