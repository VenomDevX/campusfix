from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import analytics_service as svc
from app.services.auth import require_admin

router = APIRouter(prefix="/api/analytics", tags=["analytics"], dependencies=[Depends(require_admin)])


@router.get("/overview")
def overview(db: Session = Depends(get_db)):
    return svc.overview(db)


@router.get("/categories")
def categories(db: Session = Depends(get_db)):
    return svc.categories(db)


@router.get("/hotspots")
def hotspots(db: Session = Depends(get_db)):
    return svc.hotspots(db)


@router.get("/departments")
def departments(db: Session = Depends(get_db)):
    return svc.departments(db)


# Aggregate-only campus snapshot for the public landing page (no ticket details).
public = APIRouter(prefix="/api/public", tags=["public"])


@public.get("/campus")
def campus(db: Session = Depends(get_db)):
    return {"hotspots": svc.hotspots(db), "insights": svc.overview(db)["insights"]}
