import random
import string

MEETING_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _random_segment(length: int = 3) -> str:
    return "".join(random.choices(MEETING_CODE_CHARS, k=length))


def generate_meeting_code() -> str:
    return f"{_random_segment()}-{_random_segment()}-{_random_segment()}"
