from datetime import datetime
from typing import Any


class WebRTCService:
    """WebRTC signaling helpers — backend only forwards signaling messages."""

    @staticmethod
    def build_signal_message(
        signal_type: str,
        data: dict[str, Any],
        sender_id: str,
        meeting_code: str,
    ) -> dict[str, Any]:
        return {
            "type": signal_type,
            "data": data,
            "sender_id": sender_id,
            "timestamp": datetime.utcnow().isoformat(),
            "meeting_code": meeting_code,
        }

    @staticmethod
    def validate_webrtc_message(message_type: str, data: dict[str, Any]) -> bool:
        if message_type in ("webrtc_offer", "webrtc_answer", "webrtc_ice_candidate"):
            return "target_id" in data
        return True

    @staticmethod
    def get_target_id(data: dict[str, Any]) -> str | None:
        return data.get("target_id")


webrtc_service = WebRTCService()
