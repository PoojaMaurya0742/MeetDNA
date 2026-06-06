import io
import logging
import os
from typing import Any

from groq import Groq

from utils.json_parser import parse_json_response

logger = logging.getLogger(__name__)


class GroqService:
    def __init__(self) -> None:
        api_key = os.getenv("GROQ_API_KEY")
        self.client = Groq(api_key=api_key) if api_key else None
        self.llm_model = "llama-3.3-70b-versatile"

    def _ensure_client(self) -> Groq:
        if not self.client:
            raise RuntimeError("GROQ_API_KEY is not configured")
        return self.client

    async def chat_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 1500,
    ) -> dict[str, Any]:
        client = self._ensure_client()
        try:
            response = client.chat.completions.create(
                model=self.llm_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            content = response.choices[0].message.content or "{}"
            return parse_json_response(content)
        except Exception as exc:
            logger.error("Groq chat completion failed: %s", exc)
            raise

    async def extract_dna(
        self, transcript_chunk: str, existing_dna: list[dict]
    ) -> dict[str, Any]:
        system_prompt = """You are MeetDNA's AI extraction engine.
Analyze meeting transcript and extract structured DNA.
Return ONLY valid JSON. No markdown. No explanation.
Format:
{
  "strands": [
    {
      "type": "DECISION|ACTION|RISK|INSIGHT|CONTEXT",
      "content": "clear concise description",
      "source_quote": "exact words from transcript max 20 words",
      "speaker": "speaker name or null",
      "assignee": "person name if ACTION else null",
      "due_date": "YYYY-MM-DD if mentioned else null",
      "severity": "LOW|MEDIUM|HIGH if RISK else null",
      "confidence": 0.0 to 1.0,
      "keywords": ["kw1", "kw2"]
    }
  ]
}
Extract ONLY new insights not already in existing DNA.
If nothing new found return {"strands": []}"""

        import json

        user_prompt = (
            f"New transcript:\n{transcript_chunk}\n\n"
            f"Already extracted:\n{json.dumps([d.get('content', '') for d in existing_dna])}"
        )
        return await self.chat_completion(system_prompt, user_prompt, temperature=0.1, max_tokens=1500)

    async def generate_briefing(
        self, upcoming_topic: str, participants: list[str], recalled_memories: list[dict]
    ) -> dict[str, Any]:
        system_prompt = """You are MeetDNA's briefing engine.
Using retrieved Hindsight memory context (RAG),
generate an intelligent pre-meeting brief.
Return ONLY valid JSON:
{
  "brief_title": "string",
  "context_summary": "2-3 sentences",
  "relevant_history": ["point1", "point2", "point3"],
  "suggested_talking_points": ["point1", "point2", "point3"],
  "watch_out_for": ["risk1", "risk2"],
  "unresolved_items": ["item1", "item2"],
  "memories_used": number,
  "confidence_score": 0-100
}"""

        memory_lines = [
            f"[{m.get('type', 'UNKNOWN')}] {m.get('content', '')} "
            f"(from: {m.get('source_meeting_title', 'unknown')})"
            for m in recalled_memories
        ]
        user_prompt = (
            f'Upcoming meeting: "{upcoming_topic}"\n'
            f"Participants: {', '.join(participants)}\n"
            f"Retrieved Hindsight memories:\n" + "\n".join(memory_lines)
        )
        return await self.chat_completion(system_prompt, user_prompt, temperature=0.3, max_tokens=1000)

    async def generate_summary(self, meeting: dict) -> dict[str, Any]:
        import json

        system_prompt = """You are MeetDNA's post-meeting intelligence engine.
Generate a comprehensive meeting summary.
Return ONLY valid JSON:
{
  "executive_summary": "3-4 sentence overview",
  "key_outcomes": ["outcome1", "outcome2"],
  "decisions": [
    {"decision": "text", "made_by": "name", "impact": "HIGH|MEDIUM|LOW"}
  ],
  "action_items": [
    {"task": "text", "owner": "name", "due_date": "YYYY-MM-DD or null", "priority": "HIGH|MEDIUM|LOW"}
  ],
  "risks_identified": [
    {"risk": "text", "severity": "HIGH|MEDIUM|LOW", "mitigation": "text"}
  ],
  "key_insights": ["insight1", "insight2"],
  "meeting_effectiveness_score": 0-100,
  "follow_up_required": true/false,
  "next_meeting_agenda": ["topic1", "topic2"],
  "speaker_summary": [
    {"name": "string", "speaking_percentage": 0-100, "key_contributions": ["c1"]}
  ]
}"""

        duration_minutes = meeting.get("duration_seconds", 0) // 60
        participants = ", ".join(p["name"] for p in meeting.get("participants", []))
        transcript_lines = [
            f"{line['speaker']}: {line['text']}" for line in meeting.get("transcript", [])
        ]
        user_prompt = (
            f'Meeting: "{meeting.get("title", "")}"\n'
            f"Duration: {duration_minutes} minutes\n"
            f"Participants: {participants}\n"
            f"Full transcript:\n" + "\n".join(transcript_lines) + "\n"
            f"Extracted DNA strands:\n{json.dumps(meeting.get('dna_strands', []), indent=2)}"
        )
        return await self.chat_completion(system_prompt, user_prompt, temperature=0.2, max_tokens=2000)

    async def filter_transcript(self, raw_text: str, speaker: str) -> dict[str, Any]:
        """Remove greetings, filler, and noise — keep only meaningful content."""
        system_prompt = """You are MeetDNA's real-time transcript filter.
Remove greetings (hi, hello, hey), filler words, small talk, and noise.
Keep ONLY key points, decisions, tasks, action items, risks, and substantive discussion.
Return ONLY valid JSON:
{
  "is_important": true or false,
  "filtered_text": "cleaned sentence or empty string if nothing important"
}"""
        user_prompt = f'Speaker: {speaker}\nRaw transcript: "{raw_text}"'
        try:
            return await self.chat_completion(system_prompt, user_prompt, temperature=0.1, max_tokens=300)
        except Exception:
            lowered = raw_text.lower().strip()
            noise = {"hi", "hello", "hey", "ok", "okay", "thanks", "thank you", "bye"}
            if lowered in noise or len(lowered) < 4:
                return {"is_important": False, "filtered_text": ""}
            return {"is_important": True, "filtered_text": raw_text.strip()}


groq_service = GroqService()
