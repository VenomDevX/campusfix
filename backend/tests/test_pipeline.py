"""Self-check for the AI pipeline. Run: python test_pipeline.py
Rule checks run with the heuristic model for speed; CLIP checks run too when
CAMPUSFIX_TEST_CLIP=1 (needs transformers + downloaded weights, GPU recommended)."""

import os

os.environ["CAMPUSFIX_MODEL"] = "heuristic"

from datetime import datetime
from types import SimpleNamespace

from app import sample_images
from app.services.ai_classifier import classify
from app.services.duplicate_detector import dhash, find_duplicate, image_similarity
from app.services.priority_engine import score_priority
from app.services.routing_engine import route

# Priority: spec examples
assert score_priority("Electrical", "Cafeteria", "sparks from switch", support_count=3).level == "Critical"
assert score_priority("Furniture", "Parking", "broken chair").level in {"Low", "Medium"}
assert score_priority("Plumbing", "Block A", "water leakage").level in {"High", "Critical"}

# Classification on sample images + descriptions
for kind, desc, want in [("water_leak", "water leaking", "Plumbing"), ("broken_chair", "chair broken", "Furniture"),
                         ("overflowing_dustbin", "", "Sanitation"), ("damaged_switch", "", "Electrical"),
                         ("cracked_floor", "", "Infrastructure"), ("exposed_wiring", "", "Electrical")]:
    got = classify(sample_images.make(kind), kind, desc).category
    assert got == want, (kind, got)
    # image-only (no text hints) should still land on the right category for most samples
    print(f"{kind:22} text+image={got:15} image-only={classify(sample_images.make(kind)).category}")

# Duplicates: identical image -> similarity 1.0 and matched; different kind -> not matched
leak = dhash(sample_images.make("water_leak"))
assert image_similarity(leak, leak) == 1.0
existing = SimpleNamespace(code="CF-1", status="Assigned", created_at=datetime.utcnow(), phash=leak,
                           building="Block B", category="Plumbing")
assert find_duplicate(leak, "Plumbing", "Block B", [existing]).similarity >= 0.99
chair = dhash(sample_images.make("broken_chair"))
assert find_duplicate(chair, "Furniture", "Library", [existing]) is None
existing.status = "Resolved"
assert find_duplicate(leak, "Plumbing", "Block B", [existing]) is None  # closed tickets never match

assert route("Plumbing") == "Plumbing Maintenance" and route("Other") == "General Admin"
print("All pipeline checks passed.")

# Auth: password hashing and signed tokens
from app.services.auth import hash_password, make_token, read_token, verify_password

h = hash_password("student123")
assert verify_password("student123", h) and not verify_password("wrong", h)
u = SimpleNamespace(id=7, role="student")
tok = make_token(u)
assert read_token(tok) == 7
assert read_token(tok[:-2] + ("AA" if tok[-2:] != "AA" else "BB")) is None  # tampered signature
assert read_token(make_token(u, now=0)) is None  # expired
assert read_token("garbage") is None
import jwt  # noqa: E402
assert read_token(jwt.encode({"sub": "7", "exp": 9999999999}, "attacker-key", algorithm="HS256")) is None  # forged
print("Auth checks passed.")

if os.getenv("CAMPUSFIX_TEST_CLIP") == "1":
    from app.services import vision_model
    os.environ["CAMPUSFIX_MODEL"] = os.getenv("CAMPUSFIX_TEST_MODEL", vision_model.DEFAULT_MODEL)
    from app.services.duplicate_detector import clip_similarity

    m = vision_model.get_model()
    assert m, "CLIP failed to load"
    embs = {}
    for kind, want in [("water_leak", "Plumbing"), ("broken_chair", "Furniture"), ("overflowing_dustbin", "Sanitation"),
                       ("damaged_switch", "Electrical"), ("cracked_floor", "Infrastructure"), ("exposed_wiring", "Electrical")]:
        c = classify(sample_images.make(kind), "", "")  # image only, no text hints
        assert c.category == want, (kind, c.category)
        embs[kind] = c.embedding
    same = clip_similarity(embs["water_leak"], m.analyse(sample_images.make("water_leak", 1))[1])
    diff = clip_similarity(embs["water_leak"], embs["broken_chair"])
    assert same > 0.75 > diff, (same, diff)
    print(f"CLIP checks passed ({m.name}).")
