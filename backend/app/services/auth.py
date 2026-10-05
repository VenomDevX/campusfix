"""Auth: PBKDF2 password hashing + JWT (HS256) sessions in an httpOnly cookie.

The browser never sees the token: it is set as `campusfix_session` (httpOnly,
SameSite=Lax) on login/signup and sent back automatically on same-origin requests.
A Bearer header is also accepted for curl / API clients.
"""

import hashlib
import hmac
import logging
import os
import secrets
import time

import jwt
from fastapi import Depends, Header, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User

log = logging.getLogger("campusfix.auth")

APP_ENV = os.getenv("APP_ENV", "development")
PRODUCTION = APP_ENV == "production"
COOKIE = "campusfix_session"
TOKEN_TTL = 7 * 24 * 3600
ITERATIONS = 200_000
CSRF_HEADER = "campusfix"  # value the frontend sends in X-Requested-With

SECRET_KEY = os.getenv("SECRET_KEY", "")
if not SECRET_KEY:
    if PRODUCTION:
        raise RuntimeError("SECRET_KEY must be set when APP_ENV=production")
    SECRET_KEY = secrets.token_urlsafe(32)
    log.warning("SECRET_KEY not set: using a random dev key (sessions reset on restart).")


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), ITERATIONS).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    salt, digest = stored.split("$", 1)
    check = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), ITERATIONS).hex()
    return hmac.compare_digest(check, digest)


def make_token(user: User, now: float | None = None) -> str:
    iat = int(time.time() if now is None else now)
    return jwt.encode({"sub": str(user.id), "role": user.role, "iat": iat, "exp": iat + TOKEN_TTL},
                      SECRET_KEY, algorithm="HS256")


def read_token(token: str) -> int | None:
    """User id for a valid, unexpired token signed by us, else None."""
    try:
        claims = jwt.decode(token, SECRET_KEY, algorithms=["HS256"], options={"require": ["exp", "sub"]})
        return int(claims["sub"])
    except (jwt.InvalidTokenError, ValueError):
        return None


def set_session_cookie(response: Response, user: User):
    response.set_cookie(COOKIE, make_token(user), max_age=TOKEN_TTL, httponly=True, samesite="lax",
                        secure=PRODUCTION, path="/")


def clear_session_cookie(response: Response):
    response.delete_cookie(COOKIE, path="/", httponly=True, samesite="lax", secure=PRODUCTION)


def current_user(request: Request, authorization: str = Header(default=""), db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(COOKIE) or authorization.removeprefix("Bearer ").strip()
    user_id = read_token(token) if token else None
    user = db.get(User, user_id) if user_id else None
    if not user:
        raise HTTPException(401, "Please log in to continue.")
    return user


def require_admin(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "This needs an admin account.")
    return user


async def csrf_guard(request: Request):
    """Defence in depth on top of SameSite=Lax: cookie-authenticated mutations must carry
    a custom header, which a cross-site form or image tag cannot send."""
    if (request.method in {"POST", "PUT", "PATCH", "DELETE"} and request.cookies.get(COOKIE)
            and request.headers.get("x-requested-with") != CSRF_HEADER):
        raise HTTPException(403, "Missing X-Requested-With header.")
