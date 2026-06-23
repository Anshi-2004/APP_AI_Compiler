from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RepairHistory(Base):
    """
    Persistent audit log of every repair action taken.
    One row per repaired schema section per pipeline run.
    """

    __tablename__ = "repair_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pipeline_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    section: Mapped[str] = mapped_column(
        Enum("ui", "api", "database", "auth", "business_logic", name="repair_section_enum"),
        nullable=False,
    )
    error: Mapped[str] = mapped_column(Text, nullable=False)
    repair_reason: Mapped[str] = mapped_column(Text, nullable=False)
    original_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    updated_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    repair_time_ms: Mapped[int] = mapped_column(Integer, default=0)
    success: Mapped[bool] = mapped_column(Boolean, default=False)
    error_count: Mapped[int] = mapped_column(Integer, default=0)
    errors_fixed: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    def __repr__(self) -> str:
        return (
            f"<RepairHistory run={self.run_id} section={self.section} "
            f"success={self.success} fixed={self.errors_fixed}/{self.error_count}>"
        )
