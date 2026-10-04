"""Ticket lifecycle: create, merge (support), status transitions, serialization."""

import json
from datetime import datetime

from sqlalchemy.orm import Session

from models import Department, Issue, IssueReport, Notification, Resolution, StatusHistory
from services.pipeline import Analysis, rescore

# Allowed admin transitions. Keeps the lifecycle honest (no Resolved -> Assigned jumps).
TRANSITIONS = {
    "Reported": {"AI Verified", "Assigned"},
    "AI Verified": {"Assigned", "In Progress", "Resolved"},
    "Assigned": {"In Progress", "Resolved"},
    "In Progress": {"Resolved", "Assigned"},
    "Resolved": {"Reopened"},
    "Reopened": {"Assigned", "In Progress", "Resolved"},
}


TITLES = {
    "Plumbing": "Water leakage", "Electrical": "Electrical fault", "Furniture": "Damaged furniture",
    "Sanitation": "Garbage overflow", "Infrastructure": "Structural damage", "Other": "Maintenance request",
}


def _add_history(issue: Issue, status: str, note: str, at: datetime):
    issue.history.append(StatusHistory(status=status, note=note, created_at=at))


def notify_reporters(db: Session, issue: Issue, message: str, at: datetime | None = None,
                     exclude_user_id: int | None = None):
    """In-app notification to every student who reported or supported this issue."""
    users = {r.user_id for r in issue.reports if r.user_id and r.user_id != exclude_user_id}
    for uid in users:
        db.add(Notification(user_id=uid, issue=issue, message=message, created_at=at or datetime.utcnow()))


def create_issue(db: Session, a: Analysis, upload_id: str, building: str, floor: str,
                 description: str, at: datetime | None = None, user_id: int | None = None) -> Issue:
    at = at or datetime.utcnow()
    dept = db.query(Department).filter_by(name=a.department).one()
    # Prefer a concrete keyword signal ("Exposed wiring detected"); else a plain category title.
    lead = next((x for x in a.signals if not x.startswith("Vision model")), TITLES.get(a.category, a.category))
    issue = Issue(
        code="pending", title=f"{lead} - {building}", description=description, category=a.category,
        confidence=a.confidence, building=building, floor=floor, priority=a.priority.level,
        priority_score=a.priority.score, signals="\n".join(a.signals), reasoning="\n".join(a.priority.reasons),
        status="AI Verified", department=dept, image_path=upload_id, phash=a.phash,
        embedding=json.dumps(a.embedding) if a.embedding else None, created_at=at, updated_at=at,
    )
    issue.reports.append(IssueReport(kind="original", note=description, image_path=upload_id, created_at=at, user_id=user_id))
    _add_history(issue, "Reported", "Submitted by student with photo", at)
    _add_history(issue, "AI Verified",
                 f"Classified as {a.category} ({round(a.confidence * 100)}% confidence), "
                 f"priority {a.priority.level} ({a.priority.score}/100), routed to {a.department}", at)
    db.add(issue)
    db.flush()
    issue.code = f"CF-{1000 + issue.id}"
    return issue


def add_support(db: Session, issue: Issue, note: str = "", upload_id: str | None = None,
                at: datetime | None = None, user_id: int | None = None) -> Issue:
    at = at or datetime.utcnow()
    issue.support_count += 1
    issue.reports.append(IssueReport(kind="support", note=note, image_path=upload_id, created_at=at, user_id=user_id))
    old = issue.priority
    p = rescore(issue)
    issue.priority, issue.priority_score, issue.reasoning = p.level, p.score, "\n".join(p.reasons)
    issue.updated_at = at
    msg = f"Duplicate report merged (+1 support, total {issue.support_count + 1} reporters)"
    if p.level != old:
        msg += f"; priority escalated {old} -> {p.level}"
    _add_history(issue, issue.status, msg, at)
    notify_reporters(db, issue, f"{issue.code}: another student reported the same issue. Priority is now {p.level}.",
                     at, exclude_user_id=user_id)
    return issue


def change_status(issue: Issue, status: str, note: str = "", remarks: str = "",
                  after_image: str | None = None, at: datetime | None = None, db: Session | None = None) -> Issue:
    if status not in TRANSITIONS.get(issue.status, set()):
        raise ValueError(f"Cannot move from {issue.status} to {status}")
    at = at or datetime.utcnow()
    issue.status, issue.updated_at = status, at
    if status == "Resolved":
        issue.resolved_at = at
        issue.resolution = Resolution(remarks=remarks, after_image_path=after_image, created_at=at)
    elif status == "Reopened":
        issue.resolved_at = None
    default_note = {"Assigned": f"Assigned to {issue.department.name}", "In Progress": "Work started on site",
                    "Resolved": remarks or "Marked resolved", "Reopened": "Reopened - issue persists"}
    _add_history(issue, status, note or default_note.get(status, ""), at)
    if db is not None:
        friendly = {"Assigned": f"assigned to {issue.department.name}", "In Progress": "work has started",
                    "Resolved": "marked resolved", "Reopened": "reopened"}.get(status, status.lower())
        notify_reporters(db, issue, f"{issue.code} {friendly}.", at)
    return issue


def reroute(db: Session, issue: Issue, department: str, note: str = "", at: datetime | None = None) -> Issue:
    """Admin override of the AI routing decision."""
    dept = db.query(Department).filter_by(name=department).first()
    if not dept:
        raise ValueError(f"Unknown department '{department}'")
    if dept.id == issue.department_id:
        raise ValueError(f"Already routed to {department}")
    at = at or datetime.utcnow()
    old = issue.department.name
    issue.department, issue.updated_at = dept, at
    _add_history(issue, issue.status, f"Re-routed from {old} to {department}" + (f": {note}" if note else ""), at)
    notify_reporters(db, issue, f"{issue.code} was moved to {department}.", at)
    return issue


def url(path: str | None) -> str | None:
    return f"/uploads/{path}" if path else None


def serialize(issue: Issue, detail: bool = False) -> dict:
    d = {
        "id": issue.code, "title": issue.title, "description": issue.description, "category": issue.category,
        "confidence": issue.confidence, "building": issue.building, "floor": issue.floor,
        "priority": issue.priority, "priority_score": issue.priority_score, "status": issue.status,
        "department": issue.department.name, "image_url": url(issue.image_path),
        "support_count": issue.support_count, "created_at": issue.created_at,
        "updated_at": issue.updated_at, "resolved_at": issue.resolved_at,
    }
    if detail:
        r = issue.resolution
        d |= {
            "reasoning": [x for x in issue.reasoning.split("\n") if x],
            "history": [{"status": h.status, "note": h.note, "created_at": h.created_at} for h in issue.history],
            "reports": [{"kind": x.kind, "note": x.note, "image_url": url(x.image_path), "created_at": x.created_at}
                        for x in issue.reports],
            "resolution": {"remarks": r.remarks, "after_image_url": url(r.after_image_path), "created_at": r.created_at}
            if r else None,
        }
    return d
