"""Duplicate detection.

Visual similarity = cosine of CLIP ViT-L/14 image embeddings (semantic: the same leak
from a different angle still matches). When either ticket has no CLIP embedding
(model disabled), fall back to a 64-bit difference hash as a ±1 vector.
A combined score fuses visual similarity with category and location agreement,
restricted to open tickets in a recent window.

ponytail: linear scan over open tickets in the last 14 days, fine at campus scale;
store embeddings in pgvector and query nearest neighbours if volume grows.
"""

import json
import math
from dataclasses import dataclass
from datetime import datetime, timedelta

from PIL import Image

WINDOW_DAYS = 14
THRESHOLD = 0.75
OPEN_STATUSES = {"Reported", "AI Verified", "Assigned", "In Progress", "Reopened"}

# Buildings considered "nearby" (same cluster on campus).
NEARBY = {
    "Block B": {"Washroom Area"}, "Washroom Area": {"Block B", "Block A"},
    "Cafeteria": {"Library"}, "Library": {"Cafeteria"}, "Block A": {"Washroom Area"},
}


def dhash(img: Image.Image) -> str:
    """64-bit difference hash as 16 hex chars."""
    px = list(img.convert("L").resize((9, 8)).getdata())
    bits = 0
    for row in range(8):
        for col in range(8):
            bits = (bits << 1) | (px[row * 9 + col] > px[row * 9 + col + 1])
    return f"{bits:016x}"


def embed(h: str) -> list[int]:
    bits = int(h, 16)
    return [1 if bits >> i & 1 else -1 for i in range(64)]


def cosine(a: list[int], b: list[int]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))


def image_similarity(h1: str, h2: str) -> float:
    # Cosine of ±1 vectors lies in [-1, 1]; rescale to [0, 1].
    return round((cosine(embed(h1), embed(h2)) + 1) / 2, 3)


def clip_similarity(e1: list[float], e2: list[float], floor: float | None = None) -> float:
    """Cosine of two L2-normalised embeddings, rescaled from [floor, 1] to [0, 1]
    (unrelated photos rarely score below the model's floor)."""
    if floor is None:
        from app.services import vision_model
        m = vision_model.get_model()
        floor = m.floor if m else 0.5
    cos = sum(a * b for a, b in zip(e1, e2))
    return round(max(0.0, min(1.0, (cos - floor) / (1 - floor))), 3)


@dataclass
class DuplicateMatch:
    issue: object
    similarity: float  # combined score
    image_similarity: float


def find_duplicate(phash: str, category: str, building: str, candidates, now: datetime | None = None,
                   embedding: list[float] | None = None):
    """Return best DuplicateMatch above THRESHOLD among `candidates` (Issue rows), else None."""
    now = now or datetime.utcnow()
    best = None
    for issue in candidates:
        if issue.status not in OPEN_STATUSES or now - issue.created_at > timedelta(days=WINDOW_DAYS):
            continue
        other = getattr(issue, "embedding", None)
        stored = json.loads(other) if other else None
        # Embeddings from a different model (different length) aren't comparable: fall back to dHash.
        img_sim = (clip_similarity(embedding, stored) if embedding and stored and len(stored) == len(embedding)
                   else image_similarity(phash, issue.phash))
        loc = 1.0 if issue.building == building else 0.5 if issue.building in NEARBY.get(building, ()) else 0.0
        score = round(0.6 * img_sim + 0.25 * (issue.category == category) + 0.15 * loc, 3)
        if score >= THRESHOLD and (best is None or score > best.similarity):
            best = DuplicateMatch(issue, score, img_sim)
    return best
