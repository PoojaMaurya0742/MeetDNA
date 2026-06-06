import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status

from models.memory import MemoryRecallRequest, MemoryStoreMeetingRequest, MemoryStoreRequest
from services.hindsight_service import hindsight_service
from services.redis_service import redis_service
from utils.dependencies import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/store")
async def store_memory(
    body: MemoryStoreRequest,
    user_id: str = Depends(get_current_user_id),
):
    try:
        target_user_id = body.user_id or user_id
        memory = await hindsight_service.store_memory(
            strand=body.strand,
            meeting_code=body.meeting_code,
            meeting_title=body.meeting_title,
            user_id=target_user_id,
        )
        return {"memory_id": memory["id"], "stored": True}
    except Exception as exc:
        logger.error("Memory store failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store memory: {exc}",
        ) from exc


@router.get("/vault")
async def memory_vault(
    type: str = Query(default="ALL"),
    limit: int = Query(default=50, ge=1, le=200),
    search: str | None = Query(default=None),
    user_id: str = Depends(get_current_user_id),
):
    try:
        if search:
            memories = await hindsight_service.search(
                query=search,
                user_id=user_id,
                top_k=limit,
                filter_type=type if type != "ALL" else None,
            )
        else:
            memories = await redis_service.get_user_memories(user_id)
            if type != "ALL":
                memories = [m for m in memories if m.get("type") == type]
            memories.sort(key=lambda m: m.get("stored_at", ""), reverse=True)
            memories = memories[:limit]

        return {"memories": memories, "total": len(memories)}
    except Exception as exc:
        logger.error("Memory vault fetch failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch memory vault: {exc}",
        ) from exc


@router.post("/recall")
async def recall_memory(
    body: MemoryRecallRequest,
    user_id: str = Depends(get_current_user_id),
):
    try:
        memories = await hindsight_service.recall(
            query=body.query,
            user_id=user_id,
            limit=body.limit,
        )
        return {"memories": memories, "recall_count": len(memories)}
    except Exception as exc:
        logger.error("Memory recall failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Memory recall failed: {exc}",
        ) from exc


@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: str,
    user_id: str = Depends(get_current_user_id),
):
    try:
        memory = await redis_service.get_memory(memory_id)
        if not memory:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Memory not found",
            )
        if memory.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this memory",
            )
        await hindsight_service.delete_memory(memory_id, user_id)
        return {"deleted": True, "memory_id": memory_id}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Memory delete failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete memory: {exc}",
        ) from exc


@router.post("/store-meeting")
async def store_meeting_memories(
    body: MemoryStoreMeetingRequest,
    user_id: str = Depends(get_current_user_id),
):
    try:
        meeting = await redis_service.get_meeting(body.meeting_code)
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meeting not found",
            )

        stored = await hindsight_service.store_meeting_dna(meeting, user_id)
        meeting["dna_strands"] = meeting.get("dna_strands", [])
        await redis_service.save_meeting(body.meeting_code, meeting)

        return {
            "stored_count": len(stored),
            "memory_ids": [m["id"] for m in stored],
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Store meeting memories failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store meeting memories: {exc}",
        ) from exc
