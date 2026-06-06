import logging
from datetime import datetime
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        self.rooms: dict[str, dict[str, WebSocket]] = {}

    async def connect(self, code: str, participant_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        if code not in self.rooms:
            self.rooms[code] = {}
        self.rooms[code][participant_id] = websocket

    async def disconnect(self, code: str, participant_id: str) -> None:
        if code in self.rooms:
            self.rooms[code].pop(participant_id, None)
            if not self.rooms[code]:
                del self.rooms[code]

    async def broadcast_to_room(
        self, code: str, message: dict[str, Any], exclude_id: str | None = None
    ) -> None:
        if code not in self.rooms:
            return
        dead_connections: list[str] = []
        for pid, ws in self.rooms[code].items():
            if pid != exclude_id:
                try:
                    await ws.send_json(message)
                except Exception as exc:
                    logger.warning("Failed to send to participant %s: %s", pid, exc)
                    dead_connections.append(pid)
        for pid in dead_connections:
            await self.disconnect(code, pid)

    async def send_to_participant(
        self, code: str, participant_id: str, message: dict[str, Any]
    ) -> None:
        if code in self.rooms and participant_id in self.rooms[code]:
            try:
                await self.rooms[code][participant_id].send_json(message)
            except Exception as exc:
                logger.warning("Failed to send to participant %s: %s", participant_id, exc)
                await self.disconnect(code, participant_id)

    def build_message(
        self,
        message_type: str,
        data: dict[str, Any],
        sender_id: str,
        meeting_code: str,
    ) -> dict[str, Any]:
        return {
            "type": message_type,
            "data": data,
            "sender_id": sender_id,
            "timestamp": datetime.utcnow().isoformat(),
            "meeting_code": meeting_code,
        }

    async def disconnect_room(self, code: str) -> None:
        if code not in self.rooms:
            return
        participants = list(self.rooms[code].keys())
        for pid in participants:
            ws = self.rooms[code].get(pid)
            if ws:
                try:
                    await ws.close()
                except Exception:
                    pass
            await self.disconnect(code, pid)


connection_manager = ConnectionManager()
