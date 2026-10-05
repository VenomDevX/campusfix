"""The CampusFix AI pipeline, end to end:

Image validation -> classification -> duplicate detection -> priority scoring -> routing
"""

import io
import uuid
from dataclasses import dataclass
from datetime import datetime

from PIL import Image, UnidentifiedImageError

from app.database import UPLOAD_DIR
from app.services.ai_classifier import classify
from app.services.duplicate_detector import DuplicateMatch, dhash, find_duplicate
from app.services.priority_engine import LOCATIONS, PriorityResult, score_priority
from app.services.routing_engine import route

MAX_BYTES = 8 * 1024 * 1024
MIN_SIDE = 64


class InvalidImage(ValueError):
    pass


def validate_and_store(data: bytes) -> tuple[str, Image.Image]:
    """Stage 1 - image validation. Rejects non-images, tiny images, oversized files;
    re-encodes to JPEG (strips EXIF/metadata) and stores it."""
    if len(data) > MAX_BYTES:
        raise InvalidImage("Image larger than 8 MB")
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except (UnidentifiedImageError, OSError):
        raise InvalidImage("File is not a valid image")
    if min(img.size) < MIN_SIDE:
        raise InvalidImage(f"Image too small (min {MIN_SIDE}px)")
    img = img.convert("RGB")
    img.thumbnail((1600, 1600))
    upload_id = f"{uuid.uuid4().hex}.jpg"
    img.save(UPLOAD_DIR / upload_id, "JPEG", quality=85)
    return upload_id, img


def load_upload(upload_id: str) -> Image.Image:
    path = UPLOAD_DIR / upload_id
    if not path.is_file():
        raise InvalidImage("Unknown upload_id - analyze the image first")
    return Image.open(path).convert("RGB")


@dataclass
class Analysis:
    category: str
    confidence: float
    signals: list[str]
    phash: str
    department: str
    priority: PriorityResult
    duplicate: DuplicateMatch | None
    embedding: list[float] | None = None
    model: str = ""


def analyze(img: Image.Image, filename: str, building: str, description: str, open_issues) -> Analysis:
    if building not in LOCATIONS:
        raise InvalidImage(f"Unknown location '{building}'")
    cls = classify(img, filename, description)
    phash = dhash(img)
    dup = find_duplicate(phash, cls.category, building, open_issues, embedding=cls.embedding)
    # If merged, the new report adds community weight to the existing ticket.
    support = (dup.issue.support_count + 1) if dup else 0
    prio = score_priority(cls.category, building, description, support, 0, cls.signals)
    if dup:
        prio.reasons.append(f"Similar open issue {dup.issue.code} exists nearby ({round(dup.similarity * 100)}% match)")
    return Analysis(cls.category, cls.confidence, cls.signals, phash, route(cls.category), prio, dup,
                    cls.embedding, cls.model)


def rescore(issue) -> PriorityResult:
    """Recompute an existing ticket's priority (after supports / as time passes)."""
    hours = (datetime.utcnow() - issue.created_at).total_seconds() / 3600
    signals = [s for s in issue.signals.split("\n") if s]
    return score_priority(issue.category, issue.building, issue.description, issue.support_count, hours, signals)
