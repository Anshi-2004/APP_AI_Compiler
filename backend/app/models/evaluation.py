from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, Float, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EvaluationRun(Base):
    """
    Top-level record for an overall compiler evaluation session.
    Bundles multiple prompt runs inside a single benchmark test.
    """

    __tablename__ = "evaluation_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("running", "success", "error", name="evaluation_status_enum"),
        default="running",
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
    total_runs: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    success_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    avg_latency_ms: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_token_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Relationships
    items: Mapped[list[EvaluationItem]] = relationship(
        "EvaluationItem", back_populates="evaluation", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<EvaluationRun id={self.id} status={self.status}>"


class EvaluationItem(Base):
    """
    Detailed result of an individual prompt run within an evaluation session.
    """

    __tablename__ = "evaluation_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    evaluation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("evaluation_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    run_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pipeline_runs.id", ondelete="SET NULL"),
        nullable=True,
    )
    prompt_name: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt_type: Mapped[str] = mapped_column(
        Enum("product", "edge_case", name="prompt_type_enum"),
        nullable=False,
    )
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("success", "error", name="item_status_enum"),
        nullable=False,
    )
    latency_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    validation_errors: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    retries: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    repair_success: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    execution_success: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    token_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    evaluation: Mapped[EvaluationRun] = relationship(
        "EvaluationRun", back_populates="items"
    )

    def __repr__(self) -> str:
        return f"<EvaluationItem id={self.id} prompt_name={self.prompt_name} status={self.status}>"
