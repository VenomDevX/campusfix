"""Aggregations for the admin dashboard. Computed on the fly from tickets — cheap
at campus scale; precompute into a materialized view if ticket volume grows."""

from collections import Counter
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models import Issue, IssueReport
from app.services.duplicate_detector import OPEN_STATUSES
from app.services.priority_engine import LOCATIONS

RECURRING_MIN = 3
RECURRING_DAYS = 30

ADVICE = {
    "Plumbing": "inspect the underlying pipe system instead of temporary repair",
    "Electrical": "schedule a full wiring audit of the area",
    "Sanitation": "increase cleaning frequency or add more bins",
    "Furniture": "replace the furniture batch rather than one-off fixes",
    "Infrastructure": "commission a structural inspection",
    "Other": "review the area with facility management",
}


def heat_level(open_count: int, critical: int, recent_total: int = 0) -> str:
    # Open load + weight for critical tickets + a recurrence term (recent history matters).
    heat = open_count + 2 * critical + recent_total // 2
    return "critical" if heat >= 6 else "high" if heat >= 4 else "moderate" if heat >= 2 else "low"


def recurring_insights(issues: list[Issue], now: datetime | None = None) -> list[dict]:
    now = now or datetime.utcnow()
    recent = [i for i in issues if now - i.created_at <= timedelta(days=RECURRING_DAYS)]
    counts = Counter((i.category, i.building) for i in recent)
    out = []
    for (cat, building), n in counts.most_common():
        if n >= RECURRING_MIN:
            out.append({
                "category": cat, "building": building, "count": n,
                "message": f"Recurring {cat.lower()} issue detected in {building} ({n} reports in {RECURRING_DAYS} days). "
                           f"Recommended: {ADVICE[cat]}.",
            })
    return out


def overview(db: Session) -> dict:
    issues = db.query(Issue).all()
    resolved = [i for i in issues if i.status == "Resolved" and i.resolved_at]
    avg_hours = (sum((i.resolved_at - i.created_at).total_seconds() for i in resolved) / len(resolved) / 3600) if resolved else 0
    today = datetime.utcnow().date()
    trend = []
    for d in range(6, -1, -1):
        day = today - timedelta(days=d)
        trend.append({
            "date": day.strftime("%d %b"),
            "reported": sum(i.created_at.date() == day for i in issues),
            "resolved": sum(bool(i.resolved_at) and i.resolved_at.date() == day for i in issues),
        })
    return {
        "total_reports": db.query(IssueReport).count(),
        "total_issues": len(issues),
        "active_issues": sum(i.status in OPEN_STATUSES for i in issues),
        "critical_issues": sum(i.status in OPEN_STATUSES and i.priority == "Critical" for i in issues),
        "resolved_issues": sum(i.status == "Resolved" for i in issues),
        "avg_resolution_hours": round(avg_hours, 1),
        "duplicates_merged": db.query(IssueReport).filter(IssueReport.kind == "support").count(),
        "trend": trend,
        "insights": recurring_insights(issues),
    }


def categories(db: Session) -> dict:
    issues = db.query(Issue).all()
    return {
        "by_category": [{"name": k, "value": v} for k, v in Counter(i.category for i in issues).most_common()],
        "by_priority": [{"name": p, "value": sum(i.priority == p for i in issues)} for p in ["Critical", "High", "Medium", "Low"]],
        "by_status": [{"name": k, "value": v} for k, v in Counter(i.status for i in issues).most_common()],
        "by_building": [{"name": k, "value": v} for k, v in Counter(i.building for i in issues).most_common()],
    }


def hotspots(db: Session) -> list[dict]:
    issues = db.query(Issue).all()
    out = []
    for building, (traffic, _) in LOCATIONS.items():
        here = [i for i in issues if i.building == building]
        open_ = [i for i in here if i.status in OPEN_STATUSES]
        crit = sum(i.priority == "Critical" for i in open_)
        recent = sum(datetime.utcnow() - i.created_at <= timedelta(days=RECURRING_DAYS) for i in here)
        top = Counter(i.category for i in open_).most_common(1)
        out.append({
            "building": building, "traffic": traffic, "total": len(here), "open": len(open_),
            "critical": crit, "level": heat_level(len(open_), crit, recent), "top_category": top[0][0] if top else None,
        })
    return out


def departments(db: Session) -> list[dict]:
    issues = db.query(Issue).all()
    names = sorted({i.department.name for i in issues})
    return [{
        "department": n,
        "open": sum(i.department.name == n and i.status in OPEN_STATUSES for i in issues),
        "resolved": sum(i.department.name == n and i.status == "Resolved" for i in issues),
    } for n in names]
