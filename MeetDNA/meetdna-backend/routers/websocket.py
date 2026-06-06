import logging
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from services.connection_manager import connection_manager
from services.redis_service import redis_service
from services.webrtc_service import webrtc_service
from utils.jwt import decode_token

logger = logging.getLogger(__name__)
router = APIRouter()


async def _update_participant_state(
    code: str, participant_id: str, updates: dict
) -> None:
    meeting = await redis_service.get_meeting(code)
    if not meeting:
        return
    for participant in meeting.get("participants", []):
        if participant["id"] == participant_id:
            participant.update(updates)
            break
    await redis_service.save_meeting(code, meeting)


async def _handle_message(
    code: str,
    participant_id: str,
    user_id: str,
    message: dict,
) -> None:
    msg_type = message.get("type", "")
    data = message.get("data", {})

    if msg_type == "participant_joined":
        await connection_manager.broadcast_to_room(
            code,
            connection_manager.build_message(msg_type, data, participant_id, code),
        )
        return

    if msg_type == "participant_left":
        await _update_participant_state(code, participant_id, {"left_at": datetime.utcnow().isoformat()})
        await redis_service.remove_room_participant(code, participant_id)
        await connection_manager.broadcast_to_room(
            code,
            connection_manager.build_message(msg_type, data, participant_id, code),
        )
        return

    if msg_type in ("mute_toggle", "video_toggle", "speaking_update"):
        field_map = {
            "mute_toggle": "is_muted",
            "video_toggle": "is_video_off",
            "speaking_update": "is_speaking",
        }
        field = field_map[msg_type]
        await _update_participant_state(code, participant_id, {field: data.get(field, False)})
        await connection_manager.broadcast_to_room(
            code,
            connection_manager.build_message(msg_type, data, participant_id, code),
        )
        return

    if msg_type in ("chat_message", "raise_hand", "screen_share_start", "screen_share_stop"):
        await connection_manager.broadcast_to_room(
            code,
            connection_manager.build_message(msg_type, data, participant_id, code),
        )
        return

    if msg_type in ("host_mute", "host_unmute", "host_remove"):
        meeting = await redis_service.get_meeting(code)
        if not meeting or meeting.get("host_id") != user_id:
            return
        target_id = data.get("target_id")
        if not target_id or target_id == participant_id:
            return
        if msg_type == "host_remove":
            kick_msg = connection_manager.build_message(
                "host_kicked",
                {"reason": data.get("reason", "Removed by host")},
                participant_id,
                code,
            )
            await connection_manager.send_to_participant(code, target_id, kick_msg)
            if code in connection_manager.rooms and target_id in connection_manager.rooms[code]:
                try:
                    await connection_manager.rooms[code][target_id].close()
                except Exception:
                    pass
            await connection_manager.disconnect(code, target_id)
            await redis_service.remove_room_participant(code, target_id)
            await connection_manager.broadcast_to_room(
                code,
                connection_manager.build_message(
                    "participant_left",
                    {"participant_id": target_id, "removed_by_host": True},
                    participant_id,
                    code,
                ),
            )
            return
        muted = msg_type == "host_mute"
        await _update_participant_state(code, target_id, {"is_muted": muted})
        await connection_manager.send_to_participant(
            code,
            target_id,
            connection_manager.build_message(
                msg_type,
                {"is_muted": muted, "target_id": target_id},
                participant_id,
                code,
            ),
        )
        await connection_manager.broadcast_to_room(
            code,
            connection_manager.build_message(
                "mute_toggle",
                {"is_muted": muted, "participant_id": target_id},
                target_id,
                code,
            ),
        )
        return

    if msg_type == "transcript_line":
        meeting = await redis_service.get_meeting(code)
        if meeting:
            line = data.get("transcript_line", data)
            meeting.setdefault("transcript", []).append(line)
            meeting["transcript_since_last_extraction"] = meeting.get("transcript_since_last_extraction", 0) + 1
            await redis_service.save_meeting(code, meeting)
        await connection_manager.broadcast_to_room(
            code,
            connection_manager.build_message(msg_type, data, participant_id, code),
        )
        return

    if msg_type in ("webrtc_offer", "webrtc_answer", "webrtc_ice_candidate"):
        if not webrtc_service.validate_webrtc_message(msg_type, data):
            return
        target_id = webrtc_service.get_target_id(data)
        if target_id:
            signal = webrtc_service.build_signal_message(msg_type, data, participant_id, code)
            await connection_manager.send_to_participant(code, target_id, signal)
        return

    if msg_type == "meeting_ended":
        await connection_manager.broadcast_to_room(
            code,
            connection_manager.build_message(msg_type, data, participant_id, code),
        )
        await connection_manager.disconnect_room(code)
        return


@router.websocket("/meeting/{code}")
async def meeting_websocket(
    websocket: WebSocket,
    code: str,
    token: str = Query(...),
    participant_id: str = Query(...),
):
    user_id = decode_token(token)
    if not user_id:
        await websocket.close(code=4001, reason="Invalid token")
        return

    meeting = await redis_service.get_meeting(code)
    if not meeting:
        await websocket.close(code=4004, reason="Meeting not found")
        return

    if meeting.get("status") == "ended":
        await websocket.close(code=4000, reason="Meeting has ended")
        return

    await connection_manager.connect(code, participant_id, websocket)
    await redis_service.add_room_participant(code, participant_id)

    join_msg = connection_manager.build_message(
        "participant_joined",
        {"participant_id": participant_id},
        participant_id,
        code,
    )
    await connection_manager.broadcast_to_room(code, join_msg, exclude_id=participant_id)

    try:
        while True:
            message = await websocket.receive_json()
            await _handle_message(code, participant_id, user_id, message)
    except WebSocketDisconnect:
        logger.info("Participant %s disconnected from meeting %s", participant_id, code)
    except Exception as exc:
        logger.error("WebSocket error in meeting %s: %s", code, exc)
    finally:
        await connection_manager.disconnect(code, participant_id)
        await redis_service.remove_room_participant(code, participant_id)
        leave_msg = connection_manager.build_message(
            "participant_left",
            {"participant_id": participant_id},
            participant_id,
            code,
        )
        await connection_manager.broadcast_to_room(code, leave_msg)
