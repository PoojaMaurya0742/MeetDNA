import json
import logging
import os
from typing import Any

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

MEETING_TTL = 86400


class RedisService:
    def __init__(self) -> None:
        self._client: aioredis.Redis | None = None

    async def connect(self) -> aioredis.Redis:
        if self._client is None:
            url = os.getenv("REDIS_URL", "redis://localhost:6379")
            self._client = aioredis.from_url(url, decode_responses=True)
        return self._client

    async def _safe(self, operation: str, coro):
        try:
            return await coro
        except Exception as exc:
            logger.error("Redis %s failed: %s", operation, exc)
            raise

    async def set_json(self, key: str, value: dict | list, ex: int | None = None) -> None:
        client = await self.connect()
        await self._safe("set_json", client.set(key, json.dumps(value), ex=ex))

    async def get_json(self, key: str) -> dict | list | None:
        client = await self.connect()
        raw = await self._safe("get_json", client.get(key))
        if raw is None:
            return None
        return json.loads(raw)

    async def delete(self, key: str) -> None:
        client = await self.connect()
        await self._safe("delete", client.delete(key))

    async def lpush(self, key: str, value: str) -> None:
        client = await self.connect()
        await self._safe("lpush", client.lpush(key, value))

    async def lrange(self, key: str, start: int = 0, end: int = -1) -> list[str]:
        client = await self.connect()
        return await self._safe("lrange", client.lrange(key, start, end))

    async def sadd(self, key: str, value: str) -> None:
        client = await self.connect()
        await self._safe("sadd", client.sadd(key, value))

    async def srem(self, key: str, value: str) -> None:
        client = await self.connect()
        await self._safe("srem", client.srem(key, value))

    async def smembers(self, key: str) -> set[str]:
        client = await self.connect()
        return await self._safe("smembers", client.smembers(key))

    async def get_user(self, email: str) -> dict | None:
        result = await self.get_json(f"user:{email}")
        return result if isinstance(result, dict) else None

    async def save_user(self, user: dict) -> None:
        await self.set_json(f"user:{user['email']}", user)
        client = await self.connect()
        await self._safe("save_user_id_mapping", client.set(f"userid:{user['id']}", user["email"]))

    async def get_user_email_by_id(self, user_id: str) -> str | None:
        client = await self.connect()
        return await self._safe("get_user_email_by_id", client.get(f"userid:{user_id}"))

    async def get_user_by_id(self, user_id: str) -> dict | None:
        email = await self.get_user_email_by_id(user_id)
        if not email:
            return None
        return await self.get_user(email)

    async def get_meeting(self, code: str) -> dict | None:
        result = await self.get_json(f"meeting:{code}")
        return result if isinstance(result, dict) else None

    async def save_meeting(self, code: str, meeting: dict) -> None:
        await self.set_json(f"meeting:{code}", meeting, ex=MEETING_TTL)

    async def get_memory(self, memory_id: str) -> dict | None:
        result = await self.get_json(f"memory:{memory_id}")
        return result if isinstance(result, dict) else None

    async def save_memory(self, memory: dict) -> None:
        await self.set_json(f"memory:{memory['id']}", memory)
        await self.lpush(f"user_memories:{memory['user_id']}", memory["id"])

    async def delete_memory(self, memory_id: str, user_id: str) -> None:
        await self.delete(f"memory:{memory_id}")
        client = await self.connect()
        await self._safe("lrem", client.lrem(f"user_memories:{user_id}", 0, memory_id))

    async def get_user_memories(self, user_id: str) -> list[dict]:
        memory_ids = await self.lrange(f"user_memories:{user_id}")
        memories: list[dict] = []
        for memory_id in memory_ids:
            memory = await self.get_memory(memory_id)
            if memory:
                memories.append(memory)
        return memories

    async def add_room_participant(self, code: str, participant_id: str) -> None:
        await self.sadd(f"room_participants:{code}", participant_id)

    async def remove_room_participant(self, code: str, participant_id: str) -> None:
        await self.srem(f"room_participants:{code}", participant_id)

    async def get_room_participants(self, code: str) -> set[str]:
        return await self.smembers(f"room_participants:{code}")

    async def update_meeting_field(self, code: str, updates: dict[str, Any]) -> dict | None:
        meeting = await self.get_meeting(code)
        if not meeting:
            return None
        meeting.update(updates)
        await self.save_meeting(code, meeting)
        return meeting


redis_service = RedisService()
