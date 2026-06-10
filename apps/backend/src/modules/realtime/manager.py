import json
from typing import Dict
from fastapi import WebSocket
from ...core.logger import get_logger

logger = get_logger(__name__)


class ConnectionManager:
    def __init__(self):
        self._connections: Dict[str, WebSocket] = {}
        self._user_sessions: Dict[str, list] = {}

    async def connect(self, websocket: WebSocket, session_id: str, user_id: str) -> None:
        await websocket.accept()
        self._connections[session_id] = websocket
        if user_id not in self._user_sessions:
            self._user_sessions[user_id] = []
        self._user_sessions[user_id].append(session_id)

    def disconnect(self, session_id: str) -> None:
        if session_id in self._connections:
            del self._connections[session_id]
        for sessions in self._user_sessions.values():
            if session_id in sessions:
                sessions.remove(session_id)
                break

    async def send_personal(self, session_id: str, message: dict) -> None:
        ws = self._connections.get(session_id)
        if ws:
            try:
                await ws.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending to session {session_id}: {e}")
                self.disconnect(session_id)

    async def send_result(self, session_id: str, result) -> None:
        faces_data = result.faces if isinstance(result.faces, list) else []
        await self.send_personal(session_id, {
            "event": "emotion.result",
            "data": {
                "result_id": str(result.id),
                "faces": faces_data,
                "created_at": result.created_at.isoformat(),
            },
        })

    async def send_error(self, session_id: str, code: str, message: str) -> None:
        await self.send_personal(session_id, {
            "event": "emotion.error",
            "data": {"code": code, "message": message},
        })

    async def broadcast_to_user(self, user_id: str, message: dict) -> None:
        for session_id in self._user_sessions.get(user_id, []):
            await self.send_personal(session_id, message)

    @property
    def active_connections_count(self) -> int:
        return len(self._connections)
