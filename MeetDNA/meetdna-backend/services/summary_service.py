import logging

from services.connection_manager import connection_manager
from services.groq_service import groq_service
from services.hindsight_service import hindsight_service
from services.redis_service import redis_service

logger = logging.getLogger(__name__)


async def generate_and_store_summary(
    meeting_code: str,
    user_id: str,
    *,
    disconnect: bool = False,
) -> dict:
    meeting = await redis_service.get_meeting(meeting_code)
    if not meeting:
        return {}

    try:
        summary = await groq_service.generate_summary(meeting)
        meeting["summary"] = summary
        meeting["meeting_score"] = summary.get("meeting_effectiveness_score", 0)
        await redis_service.save_meeting(meeting_code, meeting)
        await hindsight_service.store_meeting_dna(meeting, user_id)

        if disconnect:
            end_message = connection_manager.build_message(
                "meeting_ended",
                {"summary": summary},
                sender_id=user_id,
                meeting_code=meeting_code,
            )
            await connection_manager.broadcast_to_room(meeting_code, end_message)
            await connection_manager.disconnect_room(meeting_code)

        return summary
    except Exception as exc:
        logger.error("Summary generation failed for %s: %s", meeting_code, exc)
        return {"error": str(exc), "executive_summary": "Summary generation failed"}
