from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.services.auth import clear_session_cookie, current_user, hash_password, set_session_cookie, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

EMAIL = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class SignupIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(pattern=EMAIL, max_length=200)
    password: str = Field(min_length=6, max_length=200)


class LoginIn(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str


class SessionOut(BaseModel):
    user: UserOut  # the token lives only in the httpOnly cookie


def _session(response: Response, user: User) -> dict:
    set_session_cookie(response, user)
    return {"user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role}}


@router.post("/signup", response_model=SessionOut, status_code=201)
def signup(body: SignupIn, response: Response, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if db.query(User).filter_by(email=email).first():
        raise HTTPException(409, "An account with this email already exists. Log in instead.")
    # Self sign-up always creates a student; admins are provisioned by the college.
    user = User(name=body.name.strip(), email=email, password_hash=hash_password(body.password), role="student")
    db.add(user)
    db.commit()
    return _session(response, user)


@router.post("/login", response_model=SessionOut)
def login(body: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=body.email.strip().lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Email or password is incorrect.")
    return _session(response, user)


@router.post("/logout", status_code=204)
def logout(response: Response):
    clear_session_cookie(response)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user
