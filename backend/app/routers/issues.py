import time

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Department, Issue, IssueReport, User
from app.schemas import STATUSES, AnalyzeResponse, IssueCreate, IssueDetail, IssueOut, SupportCreate
from app.services import pipeline, tickets
from app.services.auth import current_user, require_admin
from app.services.duplicate_detector import OPEN_STATUSES

router = APIRouter(prefix="/api", tags=["issues"])

PRIORITY_ORDER = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}


def _get(db: Session, code: str) -> Issue:
    issue = db.query(Issue).filter(Issue.code == code.upper()).first()
    if not issue:
        raise HTTPException(404, f"Issue {code} not found")
    return issue


def _open_issues(db: Session):
    return db.query(Issue).filter(Issue.status.in_(OPEN_STATUSES)).all()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(image: UploadFile = File(...), building: str = Form(...), floor: str = Form(""),
                  description: str = Form(""), db: Session = Depends(get_db), _: User = Depends(current_user)):
    t0 = time.perf_counter()
    try:
        upload_id, img = pipeline.validate_and_store(await image.read())
        a = pipeline.analyze(img, image.filename or "", building, description, _open_issues(db))
    except pipeline.InvalidImage as e:
        raise HTTPException(422, str(e))
    dup = a.duplicate
    return AnalyzeResponse(
        upload_id=upload_id, image_url=tickets.url(upload_id), category=a.category, confidence=a.confidence,
        priority=a.priority.level, priority_score=a.priority.score, department=a.department,
        duplicate_found=bool(dup),
        duplicate_issue_id=dup.issue.code if dup else None,
        duplicate_title=dup.issue.title if dup else None,
        duplicate_image_url=tickets.url(dup.issue.image_path) if dup else None,
        duplicate_support_count=dup.issue.support_count if dup else None,
        similarity=dup.similarity if dup else None,
        image_similarity=dup.image_similarity if dup else None,
        reasoning=a.priority.reasons,
        pipeline_ms=round((time.perf_counter() - t0) * 1000),
        model=a.model,
    )


@router.post("/issues", response_model=IssueDetail, status_code=201)
def create_issue(body: IssueCreate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    # Re-run the pipeline server-side: the client never dictates category/priority.
    try:
        img = pipeline.load_upload(body.upload_id)
        a = pipeline.analyze(img, "", body.building, body.description, [])  # user chose "create new"
    except pipeline.InvalidImage as e:
        raise HTTPException(422, str(e))
    issue = tickets.create_issue(db, a, body.upload_id, body.building, body.floor, body.description, user_id=user.id)
    db.commit()
    return tickets.serialize(issue, detail=True)


@router.get("/issues", response_model=list[IssueOut])
def list_issues(status: str | None = None, priority: str | None = None, department: str | None = None,
                open_only: bool = False, sort: str = "priority", db: Session = Depends(get_db),
                _: User = Depends(require_admin)):
    q = db.query(Issue)
    if status:
        q = q.filter(Issue.status == status)
    if priority:
        q = q.filter(Issue.priority == priority)
    if department:
        q = q.join(Department).filter(Department.name == department)
    if open_only:
        q = q.filter(Issue.status.in_(OPEN_STATUSES))
    issues = q.all()
    if sort == "recent":
        issues.sort(key=lambda i: i.created_at, reverse=True)
    else:
        issues.sort(key=lambda i: (PRIORITY_ORDER.get(i.priority, 9), -i.priority_score, i.created_at))
    return [tickets.serialize(i) for i in issues]


@router.get("/issues/mine", response_model=list[IssueOut])
def my_issues(db: Session = Depends(get_db), user: User = Depends(current_user)):
    """Tickets the user reported or supported, newest first."""
    issues = db.query(Issue).join(IssueReport).filter(IssueReport.user_id == user.id).distinct().all()
    issues.sort(key=lambda i: i.created_at, reverse=True)
    return [tickets.serialize(i) for i in issues]


@router.get("/issues/{code}", response_model=IssueDetail)
def get_issue(code: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    issue = _get(db, code)
    # Students only see tickets they reported or supported; admins see all.
    if user.role != "admin" and not any(r.user_id == user.id for r in issue.reports):
        raise HTTPException(404, f"Issue {code} not found")
    return tickets.serialize(issue, detail=True)


@router.patch("/issues/{code}/status", response_model=IssueDetail)
async def update_status(code: str, status: str = Form(...), note: str = Form(""), remarks: str = Form(""),
                        after_image: UploadFile | None = File(None), db: Session = Depends(get_db),
                        _: User = Depends(require_admin)):
    if status not in STATUSES:
        raise HTTPException(422, f"Status must be one of {STATUSES}")
    issue = _get(db, code)
    after_id = None
    if after_image and after_image.filename:
        try:
            after_id, _ = pipeline.validate_and_store(await after_image.read())
        except pipeline.InvalidImage as e:
            raise HTTPException(422, str(e))
    try:
        tickets.change_status(issue, status, note, remarks, after_id, db=db)
    except ValueError as e:
        raise HTTPException(409, str(e))
    db.commit()
    return tickets.serialize(issue, detail=True)


class RerouteIn(BaseModel):
    department: str
    note: str = Field(default="", max_length=500)


@router.get("/departments", response_model=list[str])
def list_departments(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return [d.name for d in db.query(Department).order_by(Department.name)]


@router.patch("/issues/{code}/department", response_model=IssueDetail)
def reroute_issue(code: str, body: RerouteIn, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    issue = _get(db, code)
    try:
        tickets.reroute(db, issue, body.department, body.note.strip())
    except ValueError as e:
        raise HTTPException(409, str(e))
    db.commit()
    return tickets.serialize(issue, detail=True)


@router.post("/issues/{code}/support", response_model=IssueDetail)
def support_issue(code: str, body: SupportCreate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    issue = _get(db, code)
    if issue.status not in OPEN_STATUSES:
        raise HTTPException(409, "Issue is already resolved - create a new report instead")
    if body.upload_id and not (pipeline.UPLOAD_DIR / body.upload_id).is_file():
        raise HTTPException(422, "Unknown upload_id")
    if any(r.user_id == user.id for r in issue.reports):
        raise HTTPException(409, "You have already reported this issue.")
    tickets.add_support(db, issue, body.note, body.upload_id, user_id=user.id)
    db.commit()
    return tickets.serialize(issue, detail=True)
