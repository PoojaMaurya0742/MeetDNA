import logging
import os
from datetime import datetime
from typing import Any
from uuid import uuid4

import httpx

from services.chroma_service import chroma_service
from services.redis_service import redis_service

logger = logging.getLogger(__name__)


class HindsightService:
    """Hindsight memory layer — uses Hindsight API when available, else ChromaDB + Redis."""

    def __init__(self) -> None:
        self.api_key = os.getenv("HINDSIGHT_API_KEY")
        self.base_url = os.getenv("HINDSIGHT_API_URL", "https://api.hindsight.ai/v1")

    async def _try_hindsight_api(self, endpoint: str, payload: dict) -> dict | None:
        if not self.api_key or self.api_key == "your_hindsight_api_key":
            return None
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/{endpoint}",
                    json=payload,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                )
                if response.status_code == 200:
                    return response.json()
        except Exception as exc:
            logger.warning("Hindsight API unavailable, using local fallback: %s", exc)
        return None

    async def store_memory(
        self,
        strand: dict,
        meeting_code: str,
        meeting_title: str,
        user_id: str,
    ) -> dict:
        memory = {
            "id": str(uuid4()),
            "type": strand.get("type", "CONTEXT"),
            "content": strand.get("content", ""),
            "source_meeting_code": meeting_code,
            "source_meeting_title": meeting_title,
            "speaker": strand.get("speaker"),
            "keywords": strand.get("keywords", []),
            "confidence": strand.get("confidence", 0.0),
            "stored_at": datetime.utcnow().isoformat(),
            "recall_count": 0,
            "user_id": user_id,
        }

        api_result = await self._try_hindsight_api(
            "memories",
            {"memory": memory, "user_id": user_id},
        )
        if api_result:
            memory["id"] = api_result.get("id", memory["id"])

        chroma_service.add_memory(memory["id"], memory["content"], memory)
        await redis_service.save_memory(memory)
        return memory

    async def recall(self, query: str, user_id: str, limit: int = 5) -> list[dict]:
        api_result = await self._try_hindsight_api(
            "recall",
            {"query": query, "user_id": user_id, "limit": limit},
        )
        if api_result and "memories" in api_result:
            return api_result["memories"]

        results = chroma_service.query(
            query_text=query,
            n_results=limit,
            where={"user_id": user_id},
        )
        memories: list[dict] = []
        for result in results:
            memory_id = result["id"]
            stored = await redis_service.get_memory(memory_id)
            if stored:
                stored["recall_count"] = stored.get("recall_count", 0) + 1
                await redis_service.set_json(f"memory:{memory_id}", stored)
                stored["relevance_score"] = result.get("relevance_score", 0.0)
                memories.append(stored)
            else:
                meta = result.get("metadata", {})
                memories.append({**meta, "id": memory_id, "content": result.get("content", ""), "relevance_score": result.get("relevance_score", 0.0)})
        return memories

    async def store_meeting_dna(self, meeting: dict, user_id: str) -> list[dict]:
        stored: list[dict] = []
        for strand in meeting.get("dna_strands", []):
            memory = await self.store_memory(
                strand=strand,
                meeting_code=meeting.get("code", ""),
                meeting_title=meeting.get("title", ""),
                user_id=user_id,
            )
            strand["stored_to_hindsight"] = True
            stored.append(memory)
        return stored

    async def delete_memory(self, memory_id: str, user_id: str) -> None:
        chroma_service.delete_memory(memory_id)
        await redis_service.delete_memory(memory_id, user_id)

    async def search(
        self,
        query: str,
        user_id: str,
        top_k: int = 5,
        filter_type: str | None = None,
    ) -> list[dict]:
        where: dict[str, Any] = {"user_id": user_id}
        if filter_type and filter_type != "ALL":
            where["type"] = filter_type

        results = chroma_service.query(query_text=query, n_results=top_k, where=where)
        memories: list[dict] = []
        for result in results:
            memory_id = result["id"]
            stored = await redis_service.get_memory(memory_id)
            if stored:
                stored["relevance_score"] = result.get("relevance_score", 0.0)
                memories.append(stored)
            else:
                meta = result.get("metadata", {})
                memories.append({**meta, "id": memory_id, "content": result.get("content", ""), "relevance_score": result.get("relevance_score", 0.0)})
        return memories


hindsight_service = HindsightService()
