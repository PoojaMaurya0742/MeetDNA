import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from services.hindsight_service import hindsight_service
from services.redis_service import redis_service
from utils.dependencies import get_current_user_id
from utils.keywords import cluster_keywords, extract_keywords

logger = logging.getLogger(__name__)
router = APIRouter()


class RAGSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(default=5, ge=1, le=50)
    filter_type: str | None = None


class RAGContextRequest(BaseModel):
    meeting_code: str
    current_transcript: str = ""


@router.post("/search")
async def rag_search(
    body: RAGSearchRequest,
    user_id: str = Depends(get_current_user_id),
):
    try:
        memories = await hindsight_service.search(
            query=body.query,
            user_id=user_id,
            top_k=body.top_k,
            filter_type=body.filter_type,
        )
        return {"memories": memories, "total": len(memories)}
    except Exception as exc:
        logger.error("RAG search failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG search failed: {exc}",
        ) from exc


@router.post("/context")
async def rag_context(
    body: RAGContextRequest,
    user_id: str = Depends(get_current_user_id),
):
    try:
        meeting = await redis_service.get_meeting(body.meeting_code)
        transcript_text = body.current_transcript
        if not transcript_text and meeting:
            transcript_text = "\n".join(
                line.get("text", "") for line in meeting.get("transcript", [])
            )

        keywords = extract_keywords(transcript_text, top_n=15)
        clusters = cluster_keywords(keywords, cluster_size=3)

        seen_ids: set[str] = set()
        all_memories: list[dict] = []

        for cluster in clusters:
            results = await hindsight_service.search(
                query=cluster,
                user_id=user_id,
                top_k=3,
            )
            for memory in results:
                mem_id = memory.get("id", "")
                if mem_id and mem_id not in seen_ids:
                    seen_ids.add(mem_id)
                    all_memories.append(memory)

        all_memories.sort(key=lambda m: m.get("relevance_score", 0.0), reverse=True)
        top_memories = all_memories[:5]

        return {"memories": top_memories, "keywords_used": keywords}
    except Exception as exc:
        logger.error("RAG context failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG context failed: {exc}",
        ) from exc
