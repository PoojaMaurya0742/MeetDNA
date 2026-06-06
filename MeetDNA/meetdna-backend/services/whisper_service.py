import io
import logging
import os
from typing import Any

from groq import Groq

logger = logging.getLogger(__name__)


class WhisperService:
    def __init__(self) -> None:
        api_key = os.getenv("GROQ_API_KEY")
        self.client = Groq(api_key=api_key) if api_key else None
        self.model = os.getenv("WHISPER_MODEL", "whisper-large-v3")

    async def transcribe_chunk(self, audio_bytes: bytes, filename: str = "audio.webm") -> dict[str, Any]:
        if not self.client:
            raise RuntimeError("GROQ_API_KEY is not configured")

        try:
            transcription = self.client.audio.transcriptions.create(
                file=(filename, io.BytesIO(audio_bytes), "audio/webm"),
                model=self.model,
                language="en",
                response_format="verbose_json",
            )
            result: dict[str, Any] = {
                "text": transcription.text if hasattr(transcription, "text") else str(transcription),
                "words": [],
            }
            if hasattr(transcription, "words") and transcription.words:
                result["words"] = [
                    w if isinstance(w, dict) else {"word": getattr(w, "word", ""), "start": getattr(w, "start", 0), "end": getattr(w, "end", 0)}
                    for w in transcription.words
                ]
            return result
        except Exception as exc:
            logger.error("Whisper transcription failed: %s", exc)
            raise


whisper_service = WhisperService()
