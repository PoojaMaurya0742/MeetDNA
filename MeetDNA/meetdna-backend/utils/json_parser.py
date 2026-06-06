import json
import re
from typing import Any


def strip_markdown_json(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def parse_json_response(text: str) -> dict[str, Any]:
    cleaned = strip_markdown_json(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Failed to parse JSON from LLM response: {exc}") from exc
