from typing import Literal, Optional

from pydantic import BaseModel, Field


StrandType = Literal["DECISION", "ACTION", "RISK", "INSIGHT", "CONTEXT"]
Severity = Literal["LOW", "MEDIUM", "HIGH"]


class DNAStrand(BaseModel):
    id: str
    type: StrandType
    content: str
    source_quote: str
    speaker: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    severity: Optional[Severity] = None
    confidence: float = Field(ge=0.0, le=1.0)
    keywords: list[str] = Field(default_factory=list)
    meeting_code: Optional[str] = None
    extracted_at: Optional[str] = None
    stored_to_hindsight: bool = False


class DNAStrandInput(BaseModel):
    type: StrandType
    content: str
    source_quote: str
    speaker: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    severity: Optional[Severity] = None
    confidence: float = Field(ge=0.0, le=1.0)
    keywords: list[str] = Field(default_factory=list)


class ExtractionRequest(BaseModel):
    meeting_code: str
    transcript_chunk: str = ""
    existing_dna: list[dict] = Field(default_factory=list)


class ExtractionTriggerRequest(BaseModel):
    meeting_code: str


class ExtractionResponse(BaseModel):
    new_strands: list[dict]
    total_strands: int
