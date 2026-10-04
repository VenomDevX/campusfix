from datetime import datetime

from pydantic import BaseModel, Field

STATUSES = ["Reported", "AI Verified", "Assigned", "In Progress", "Resolved", "Reopened"]


class AnalyzeResponse(BaseModel):
    upload_id: str  # stored image; pass back to POST /api/issues to avoid re-uploading
    image_url: str
    category: str
    confidence: float
    priority: str
    priority_score: int
    department: str
    duplicate_found: bool
    duplicate_issue_id: str | None = None
    duplicate_title: str | None = None
    duplicate_image_url: str | None = None
    duplicate_support_count: int | None = None
    similarity: float | None = None
    image_similarity: float | None = None
    reasoning: list[str]
    pipeline_ms: int
    model: str = ""


class IssueCreate(BaseModel):
    upload_id: str = Field(pattern=r"^[a-f0-9]{32}\.(jpg|png|webp)$")
    building: str
    floor: str
    description: str = Field(default="", max_length=1000)


class SupportCreate(BaseModel):
    upload_id: str | None = Field(default=None, pattern=r"^[a-f0-9]{32}\.(jpg|png|webp)$")
    note: str = Field(default="", max_length=1000)


class HistoryOut(BaseModel):
    status: str
    note: str
    created_at: datetime


class ReportOut(BaseModel):
    kind: str
    note: str
    image_url: str | None
    created_at: datetime


class ResolutionOut(BaseModel):
    remarks: str
    after_image_url: str | None
    created_at: datetime


class IssueOut(BaseModel):
    id: str
    title: str
    description: str
    category: str
    confidence: float
    building: str
    floor: str
    priority: str
    priority_score: int
    status: str
    department: str
    image_url: str
    support_count: int
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None


class IssueDetail(IssueOut):
    reasoning: list[str]
    history: list[HistoryOut]
    reports: list[ReportOut]
    resolution: ResolutionOut | None
