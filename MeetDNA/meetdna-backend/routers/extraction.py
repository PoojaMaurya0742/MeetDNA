import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from models.dna import ExtractionRequest, ExtractionResponse, ExtractionTriggerRequest
from services.extraction_service import run_extraction
from services.redis_service import redis_service
from utils.dependencies import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/extract", response_model=ExtractionResponse)
async def extract_dna(
    body: ExtractionRequest,
    user_id: str = Depends(get_current_user_id),
):
    try:
        meeting = await redis_service.get_meeting(body.meeting_code)
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meeting not found",
            )

        result = await run_extraction(body.meeting_code, user_id)
        return ExtractionResponse(
            new_strands=result["new_strands"],
            total_strands=result["total_strands"],
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Extraction failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Extraction failed: {exc}",
        ) from exc


@router.post("/trigger", response_model=ExtractionResponse)
async def trigger_extraction(
    body: ExtractionTriggerRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
):
    try:
        meeting = await redis_service.get_meeting(body.meeting_code)
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meeting not found",
            )

        if meeting.get("host_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the host can trigger extraction",
            )

        result = await run_extraction(body.meeting_code, user_id)
        return ExtractionResponse(
            new_strands=result["new_strands"],
            total_strands=result["total_strands"],
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Extraction trigger failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Extraction trigger failed: {exc}",
        ) from exc
