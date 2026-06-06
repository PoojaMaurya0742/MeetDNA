import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from services.groq_service import groq_service
from services.hindsight_service import hindsight_service
from utils.dependencies import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter()


class BriefingRequest(BaseModel):
    upcoming_topic: str = Field(..., min_length=1)
    participants: list[str] = Field(default_factory=list)


@router.post("/generate")
async def generate_briefing(
    body: BriefingRequest,
    user_id: str = Depends(get_current_user_id),
):
    try:
        recalled_memories = await hindsight_service.recall(
            query=body.upcoming_topic,
            user_id=user_id,
            limit=8,
        )

        briefing = await groq_service.generate_briefing(
            upcoming_topic=body.upcoming_topic,
            participants=body.participants,
            recalled_memories=recalled_memories,
        )
        briefing["memories_used"] = len(recalled_memories)

        return {"briefing": briefing, "memories_used": recalled_memories}
    except Exception as exc:
        logger.error("Briefing generation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Briefing generation failed: {exc}",
        ) from exc
