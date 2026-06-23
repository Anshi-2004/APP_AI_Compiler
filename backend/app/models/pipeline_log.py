from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PipelineLog(Base):
    """
    Per-stage execution log for a pipeline run.
    Stores input, output, timing, and errors for every stage.
    """

    __tablename__ = "pipeline_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pipeline_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    stage: Mapped[str] = mapped_column(
        Enum(
            "intent",
            "design",
            "schema",
            "validation",
            "repair",
            "runtime",
            name="stage_enum",
        ),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        Enum("running", "success", "error", name="log_status_enum"),
        nullable=False,
    )

    # JSONB columns for rich structured data
    input_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    output_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    warnings: Mapped[list | None] = mapped_column(JSON, nullable=True)

    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    execution_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationship
    run: Mapped["PipelineRun"] = relationship(  # noqa: F821
        "PipelineRun", back_populates="logs"
    )

    def __repr__(self) -> str:
        return f"<PipelineLog run={self.run_id} stage={self.stage} status={self.status}>"
