"""Explainable priority scoring (0-100).

score = category severity + location traffic + safety keywords
        + community support (duplicate reports) + time pending

Every factor contributes a human-readable reason, so admins and juries can see
exactly why a ticket is Critical. Weights are plain constants — tune them per campus,
or later learn them from historical resolution data.
"""

from dataclasses import dataclass

SEVERITY = {"Electrical": 35, "Plumbing": 30, "Infrastructure": 25, "Sanitation": 20, "Furniture": 10, "Other": 10}

# Location -> (traffic label, points)
LOCATIONS = {
    "Block A": ("high", 20), "Cafeteria": ("high", 20), "Library": ("high", 20),
    "Block B": ("medium", 12), "Washroom Area": ("medium", 12), "Lab Block": ("medium", 12),
    "Parking": ("low", 5),
}

SAFETY_WORDS = ["leak", "spark", "wire", "fire", "shock", "smoke", "slip", "collapse", "exposed", "flood", "short circuit"]

BANDS = [(75, "Critical"), (55, "High"), (30, "Medium"), (0, "Low")]


@dataclass
class PriorityResult:
    score: int
    level: str
    reasons: list[str]


def level_for(score: int) -> str:
    return next(level for floor, level in BANDS if score >= floor)


def score_priority(category: str, building: str, description: str = "", support_count: int = 0,
                   hours_pending: float = 0, category_signals: list[str] | None = None) -> PriorityResult:
    reasons = list(category_signals or [])
    score = SEVERITY.get(category, 10)
    if score >= 30:
        reasons.append(f"{category} issues carry high base severity")

    traffic, pts = LOCATIONS.get(building, ("medium", 10))
    score += pts
    if traffic == "high":
        reasons.append(f"{building} is a high-traffic area")
    elif traffic == "low":
        reasons.append(f"{building} is a low-traffic area")

    text = description.lower()
    hits = [w for w in SAFETY_WORDS if w in text]
    if hits or category == "Electrical":
        score += 20
        reasons.append("Potential safety risk" + (f" ('{hits[0]}' reported)" if hits else " to occupants")
                       if hits != ["leak"] else "Slip hazard from water on floor")

    if support_count:
        score += min(20, 5 * support_count)
        reasons.append(f"{support_count} additional student report(s) on the same issue")

    if hours_pending >= 24:
        score += min(10, int(hours_pending // 24) * 2)
        reasons.append(f"Pending for {int(hours_pending // 24)} day(s)")

    score = max(0, min(100, score))
    return PriorityResult(score, level_for(score), reasons)
