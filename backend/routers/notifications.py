from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Notification, User
from services.auth import current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def list_notifications(db: Session = Depends(get_db), user: User = Depends(current_user)):
    q = db.query(Notification).filter(Notification.user_id == user.id)
    items = q.order_by(Notification.created_at.desc()).limit(20).all()
    return {
        "unread": q.filter(Notification.read_at.is_(None)).count(),
        "items": [{"id": n.id, "issue_id": n.issue.code, "message": n.message, "created_at": n.created_at,
                   "read": n.read_at is not None} for n in items],
    }


@router.post("/read", status_code=204)
def mark_all_read(db: Session = Depends(get_db), user: User = Depends(current_user)):
    db.query(Notification).filter(Notification.user_id == user.id, Notification.read_at.is_(None)) \
        .update({Notification.read_at: datetime.utcnow()})
    db.commit()
