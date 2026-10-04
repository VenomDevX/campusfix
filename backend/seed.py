"""Seed realistic demo data so the dashboard is never empty. Runs automatically on
first startup (empty DB). Re-seed: delete campusfix.db and restart, or `python seed.py`."""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

import sample_images
from database import UPLOAD_DIR
from models import Department, User
from services.auth import hash_password
from services import pipeline, tickets
from services.routing_engine import DEPARTMENTS

# Demo accounts shown on the login page.
DEMO_USERS = [
    ("Campus Admin", "admin@campusfix.dev", "admin123", "admin"),
    ("Riya Sharma", "student@campusfix.dev", "student123", "student"),
]

# Seed tickets owned by the demo student (kept off CF-1001 so the duplicate "support" demo works).
STUDENT_TICKETS = {1, 2, 12}

# (image kind, variant, building, floor, description, days ago, status path, supports, resolution remark)
TICKETS = [
    ("water_leak", 0, "Block B", "Ground Floor", "Water leaking from washroom pipe, floor is wet and slippery",
     1.2, [], 2, ""),
    ("broken_chair", 0, "Block A", "2nd Floor", "Broken chair in Classroom 204, leg snapped",
     3, ["Assigned"], 0, ""),
    ("overflowing_dustbin", 0, "Cafeteria", "Ground Floor", "Overflowing dustbin near cafeteria counter, bad smell",
     0.4, ["Assigned", "In Progress"], 1, ""),
    ("damaged_switch", 0, "Lab Block", "1st Floor", "Damaged electrical switch board in Lab 3, burn marks and sparks",
     0.6, ["Assigned"], 2, ""),
    ("cracked_floor", 0, "Library", "Ground Floor", "Cracked floor near library entrance, tripping hazard",
     2, [], 0, ""),
    # Recurring plumbing in Block B (drives the recurring-issue insight)
    ("water_leak", 1, "Block B", "Ground Floor", "Washroom tap leaking again", 21, ["Assigned", "In Progress", "Resolved"], 1,
     "Replaced tap washer"),
    ("water_leak", 2, "Block B", "1st Floor", "Water seepage on washroom wall", 13, ["Assigned", "In Progress", "Resolved"], 0,
     "Sealed joint temporarily"),
    ("water_leak", 3, "Block B", "Ground Floor", "Pipe leak under washroom sink", 6, ["Assigned", "In Progress", "Resolved"], 2,
     "Pipe section patched"),
    # Wider history across campus
    ("water_leak", 4, "Washroom Area", "Ground Floor", "Leaking flush tank", 9, ["Assigned", "Resolved"], 0, "Flush valve replaced"),
    ("cracked_floor", 1, "Parking", "Ground", "Pothole forming at parking entry", 11, ["Assigned", "In Progress", "Resolved"], 0,
     "Filled with concrete"),
    ("overflowing_dustbin", 1, "Block A", "Ground Floor", "Garbage piling up near stairs", 4, ["Assigned", "Resolved"], 0,
     "Extra pickup scheduled"),
    ("exposed_wiring", 1, "Cafeteria", "Ground Floor", "Light fixture flickering, wire hanging", 7, ["Assigned", "In Progress", "Resolved"], 1,
     "Fixture rewired"),
    ("broken_chair", 1, "Library", "1st Floor", "Reading desk wobbly and broken", 5, ["Assigned", "In Progress"], 0, ""),
    ("cracked_floor", 2, "Block A", "3rd Floor", "Ceiling plaster cracked above corridor", 1.8, [], 1, ""),
    ("overflowing_dustbin", 2, "Lab Block", "Ground Floor", "Dustbin overflowing outside chemistry lab", 0.2, [], 0, ""),
]


def seed(db: Session):
    for name in DEPARTMENTS:
        if not db.query(Department).filter_by(name=name).first():
            db.add(Department(name=name))
    for name, email, password, role in DEMO_USERS:
        if not db.query(User).filter_by(email=email).first():
            db.add(User(name=name, email=email, password_hash=hash_password(password), role=role))
    db.flush()
    student = db.query(User).filter_by(role="student").first()

    now = datetime.utcnow()
    for n, (kind, var, building, floor, desc, days, path, supports, remark) in enumerate(TICKETS):
        img = sample_images.make(kind, var)
        upload_id = f"seed_{n:02d}_{kind}.jpg"
        img.save(UPLOAD_DIR / upload_id, "JPEG", quality=85)
        a = pipeline.analyze(img, kind, building, desc, [])
        at = now - timedelta(days=days)
        issue = tickets.create_issue(db, a, upload_id, building, floor, desc, at=at,
                                     user_id=student.id if n in STUDENT_TICKETS else None)
        for s in range(supports):
            tickets.add_support(db, issue, "Same issue seen here", at=at + timedelta(hours=1 + s))
        step = timedelta(hours=min(20, days * 24 / (len(path) + 1)))
        for k, status in enumerate(path, 1):
            tickets.change_status(issue, status, remarks=remark if status == "Resolved" else "", db=db, at=at + step * k + timedelta(hours=supports))
    db.commit()
    sample_images.export_samples(UPLOAD_DIR.parent.parent / "frontend" / "public" / "samples")


if __name__ == "__main__":
    from database import Base, SessionLocal, engine

    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
    print("Seeded.")
