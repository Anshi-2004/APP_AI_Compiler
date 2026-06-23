from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PipelineRun(Base):
    """
    Top-level record for a single compiler pipeline execution.
    One row per user prompt submission.
    """

    __tablename__ = "pipeline_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("idle", "running", "success", "error", name="run_status_enum"),
        default="idle",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    logs: Mapped[list["PipelineLog"]] = relationship(  # noqa: F821
        "PipelineLog", back_populates="run", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<PipelineRun id={self.id} status={self.status}>"
