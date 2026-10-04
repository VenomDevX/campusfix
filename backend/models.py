from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(20), default="student")  # student | admin
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Department(Base):
    __tablename__ = "departments"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)


class Issue(Base):
    """One real-world problem. Multiple student reports can merge into one Issue."""

    __tablename__ = "issues"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True)  # CF-1001
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(30), index=True)
    confidence: Mapped[float] = mapped_column(Float)
    building: Mapped[str] = mapped_column(String(50), index=True)
    floor: Mapped[str] = mapped_column(String(20))
    priority: Mapped[str] = mapped_column(String(10), index=True)
    priority_score: Mapped[int] = mapped_column(Integer)
    signals: Mapped[str] = mapped_column(Text, default="")  # AI visual/text signals, newline-joined
    reasoning: Mapped[str] = mapped_column(Text, default="")  # full priority reasoning, newline-joined
    status: Mapped[str] = mapped_column(String(20), default="Reported", index=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"))
    image_path: Mapped[str] = mapped_column(String(300))
    phash: Mapped[str] = mapped_column(String(16))  # 64-bit dHash, hex
    embedding: Mapped[str | None] = mapped_column(Text, nullable=True)  # CLIP image embedding, JSON list
    support_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    department: Mapped[Department] = relationship()
    reports: Mapped[list["IssueReport"]] = relationship(back_populates="issue", cascade="all, delete-orphan")
    history: Mapped[list["StatusHistory"]] = relationship(
        back_populates="issue", cascade="all, delete-orphan", order_by="StatusHistory.created_at"
    )
    resolution: Mapped["Resolution | None"] = relationship(back_populates="issue", cascade="all, delete-orphan")


class IssueReport(Base):
    """Each individual submission — the original report or a 'support' on a duplicate."""

    __tablename__ = "issue_reports"
    id: Mapped[int] = mapped_column(primary_key=True)
    issue_id: Mapped[int] = mapped_column(ForeignKey("issues.id"))
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    kind: Mapped[str] = mapped_column(String(20), default="original")  # original | support
    note: Mapped[str] = mapped_column(Text, default="")
    image_path: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    issue: Mapped[Issue] = relationship(back_populates="reports")


class StatusHistory(Base):
    __tablename__ = "status_history"
    id: Mapped[int] = mapped_column(primary_key=True)
    issue_id: Mapped[int] = mapped_column(ForeignKey("issues.id"))
    status: Mapped[str] = mapped_column(String(20))
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    issue: Mapped[Issue] = relationship(back_populates="history")


class Resolution(Base):
    __tablename__ = "resolutions"
    id: Mapped[int] = mapped_column(primary_key=True)
    issue_id: Mapped[int] = mapped_column(ForeignKey("issues.id"), unique=True)
    remarks: Mapped[str] = mapped_column(Text, default="")
    after_image_path: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    issue: Mapped[Issue] = relationship(back_populates="resolution")


class Notification(Base):
    """In-app notification for a user about one of their tickets."""

    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    issue_id: Mapped[int] = mapped_column(ForeignKey("issues.id"))
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    issue: Mapped[Issue] = relationship()
