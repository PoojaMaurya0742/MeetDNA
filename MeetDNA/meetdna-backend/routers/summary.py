import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from services.connection_manager import connection_manager
from services.summary_service import generate_and_store_summary
from utils.dependencies import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter()


class SummaryRequest(BaseModel):
    meeting_code: str


@router.post("/generate")
async def generate_summary(
    body: SummaryRequest,
    user_id: str = Depends(get_current_user_id),
):
    try:
        meeting = await redis_service.get_meeting(body.meeting_code)
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meeting not found",
            )

        summary = await generate_and_store_summary(body.meeting_code, user_id)

        end_message = connection_manager.build_message(
            "meeting_ended",
            {"summary": summary},
            sender_id=user_id,
            meeting_code=body.meeting_code,
        )
        await connection_manager.broadcast_to_room(body.meeting_code, end_message)

        return {"summary": summary, "meeting_code": body.meeting_code}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Summary generation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Summary generation failed: {exc}",
        ) from exc
