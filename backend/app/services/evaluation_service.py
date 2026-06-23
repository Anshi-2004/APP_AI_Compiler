from __future__ import annotations

import csv
import io
import uuid
import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evaluation import EvaluationRun, EvaluationItem
from app.services.orchestrator import Orchestrator
from app.llm.base import BaseLLMProvider
from app.core.logging_service import LoggingService


PRODUCT_PROMPTS = [
    ("CRM", "Build a CRM platform with contacts, deals, pipelines, interaction tracking, email notifications, and sales performance reports."),
    ("Hospital Management", "Build a hospital management system with patient records, doctor schedules, appointment booking, prescriptions, billing, and lab report tracking."),
    ("Library", "Build a library management system with book catalog, member registrations, book issue and return workflows, fine calculations, and reservation management."),
    ("HRMS", "Build an HR management system with employee profiles, attendance logs, leave requests, payroll processing, performance reviews, and role permissions."),
    ("Food Delivery", "Build a food delivery platform with customer ordering, restaurant menu management, delivery partner tracking, shopping cart, Stripe payments, and order history."),
    ("Inventory", "Build an inventory management system with products, stock levels, suppliers, purchase orders, sales transactions, low-stock warnings, and warehouse tracking."),
    ("LMS", "Build a learning management system with courses, lessons, student enrollments, quizzes, grading, certificates, and student progress dashboards."),
    ("Banking", "Build a core banking application with accounts, deposits, withdrawals, fund transfers, transaction search, loan requests, and account statements."),
    ("Fitness", "Build a fitness tracking app with workout plans, exercise logs, calorie tracking, goal setting, progress logs, and user profile management."),
    ("Project Management", "Build a project management platform with workspaces, projects, task boards (Kanban), user assignments, deadlines, comments, and project progress charts."),
]

EDGE_CASE_PROMPTS = [
    ("Very Vague Prompt", "saas app that does things"),
    ("Conflicting Prompt", "Build an app where all pages are public guests only, but all pages require admin authentication and JWT token security."),
    ("Incomplete Prompt", "Build an application with database."),
    ("Impossible Requirements", "Build a secure bank database that runs entirely inside client local storage without any server or backend."),
    ("Missing Authentication", "Build a clinical healthcare patient record management app but do not include any user login or authentication system."),
    ("Duplicate Modules", "Build an app with Products module, Products module, Products module, Products module, Products module."),
    ("Invalid JSON route", "Build an app where the home page route is empty string."),
    ("Circular DB dependencies", "Build an database where Table A has a foreign key to Table B, Table B has a foreign key to Table C, Table C has a foreign key to Table A."),
    ("Empty Database Tables", "Build a blog platform with post and user tables but no columns inside those tables."),
    ("Duplicate Endpoints", "Build an API that has two identical endpoints: GET /api/v1/users."),
]


class EvaluationService:
    """
    Evaluation Framework Service.
    Automates running benchmark suites (10 real product prompts + 10 edge cases),
    computing statistics, and exporting reports as CSV or PDF.
    """

    def __init__(
        self,
        llm: BaseLLMProvider,
        logger: LoggingService,
        db: AsyncSession,
    ) -> None:
        self._llm = llm
        self._logger = logger
        self._db = db

    async def create_run(self, name: str) -> EvaluationRun:
        """Create a new evaluation session in running state."""
        run = EvaluationRun(
            id=uuid.uuid4(),
            name=name,
            status="running",
            created_at=datetime.now(timezone.utc),
        )
        self._db.add(run)
        await self._db.commit()
        return run

    async def execute_evaluation(self, eval_id: uuid.UUID) -> None:
        """Background task that runs the full evaluation dataset of 20 prompts."""
        # Fetch the run record
        run = await self._db.get(EvaluationRun, eval_id)
        if not run:
            return

        all_prompts = []
        for name, text in PRODUCT_PROMPTS:
            all_prompts.append((name, "product", text))
        for name, text in EDGE_CASE_PROMPTS:
            all_prompts.append((name, "edge_case", text))

        total_runs = len(all_prompts)
        successful_runs = 0
        total_latency = 0
        total_cost = 0.0

        try:
            for name, p_type, text in all_prompts:
                # Run the compiler orchestrator
                orchestrator = Orchestrator(llm=self._llm, logger=self._logger, db=self._db)
                pipeline_result = await orchestrator.run(text)

                # Collect metrics
                status = "success" if pipeline_result.status == "success" else "error"
                if status == "success":
                    successful_runs += 1

                latency = pipeline_result.total_ms
                total_latency += latency

                val_errors = 0
                if pipeline_result.validation:
                    val_errors = pipeline_result.validation.errors

                retries = 0
                repair_ok = False
                if pipeline_result.repair:
                    retries = len(pipeline_result.repair.actions)
                    repair_ok = pipeline_result.repair.failed == 0

                exec_ok = False
                if pipeline_result.runtime:
                    exec_ok = pipeline_result.runtime.status == "success"

                # Calculate estimated token cost
                cost = await self._estimate_token_cost(uuid.UUID(pipeline_result.run_id))
                total_cost += cost

                # Save evaluation item
                item = EvaluationItem(
                    id=uuid.uuid4(),
                    evaluation_id=eval_id,
                    run_id=uuid.UUID(pipeline_result.run_id),
                    prompt_name=name,
                    prompt_type=p_type,
                    prompt_text=text,
                    status=status,
                    latency_ms=latency,
                    validation_errors=val_errors,
                    retries=retries,
                    repair_success=repair_ok,
                    execution_success=exec_ok,
                    token_cost=cost,
                    created_at=datetime.now(timezone.utc),
                )
                self._db.add(item)
                await self._db.commit()

            # Finalize run stats
            run.status = "success"
            run.completed_at = datetime.now(timezone.utc)
            run.total_runs = total_runs
            run.success_rate = (successful_runs / total_runs) * 100.0
            run.avg_latency_ms = total_latency / total_runs
            run.total_token_cost = total_cost
            await self._db.commit()

        except Exception as exc:
            run.status = "error"
            run.completed_at = datetime.now(timezone.utc)
            await self._db.commit()

    async def list_runs(self) -> list[EvaluationRun]:
        """Fetch all evaluation runs ordered by creation date."""
        stmt = select(EvaluationRun).order_by(EvaluationRun.created_at.desc())
        result = await self._db.execute(stmt)
        return list(result.scalars().all())

    async def get_run_details(self, eval_id: uuid.UUID) -> EvaluationRun | None:
        """Fetch full details of an evaluation run including items."""
        from sqlalchemy.orm import selectinload
        stmt = (
            select(EvaluationRun)
            .where(EvaluationRun.id == eval_id)
            .options(selectinload(EvaluationRun.items))
        )
        result = await self._db.execute(stmt)
        return result.scalar_one_or_none()

    async def _estimate_token_cost(self, run_id: uuid.UUID) -> float:
        """Estimate token cost for all stages of a pipeline run."""
        logs = await self._logger.get_run_logs(run_id)
        input_tokens = 0
        output_tokens = 0
        for log in logs:
            if log.input_data:
                input_tokens += len(json.dumps(log.input_data)) // 4
            if log.output_data:
                output_tokens += len(json.dumps(log.output_data)) // 4
        
        # Standard rates (e.g. GPT-4o pricing: $5/M input, $15/M output)
        return (input_tokens * 5.0 + output_tokens * 15.0) / 1_000_000.0

    def export_csv(self, run: EvaluationRun) -> str:
        """Export evaluation items to a CSV string."""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Item ID", "Prompt Name", "Prompt Type", "Prompt Text", 
            "Status", "Latency (ms)", "Validation Errors", "Retries", 
            "Repair Success", "Execution Success", "Token Cost ($)"
        ])
        
        for item in run.items:
            writer.writerow([
                str(item.id), item.prompt_name, item.prompt_type, item.prompt_text,
                item.status, item.latency_ms, item.validation_errors, item.retries,
                item.repair_success, item.execution_success, f"{item.token_cost:.6f}"
            ])
            
        return output.getvalue()

    def export_pdf(self, run: EvaluationRun) -> bytes:
        """Export evaluation report summary as PDF bytes."""
        from fpdf import FPDF
        
        class PDF(FPDF):
            def header(self):
                self.set_fill_color(9, 9, 11) # Dark zinc theme header
                self.rect(0, 0, 210, 40, "F")
                self.set_text_color(255, 255, 255)
                self.set_font("Helvetica", "B", 16)
                self.cell(0, 15, "CompilerAI Evaluation Report", ln=True, align="C")
                self.set_font("Helvetica", "I", 10)
                self.cell(0, 5, "Automated Benchmark Suite Performance", ln=True, align="C")
                self.set_text_color(0, 0, 0)
                self.ln(15)
                
            def footer(self):
                self.set_y(-15)
                self.set_font("Helvetica", "I", 8)
                self.cell(0, 10, f"Page {self.page_no()}/{{nb}} | Confidential report generated automatically", align="C")

        pdf = PDF()
        pdf.alias_nb_pages()
        pdf.add_page()
        
        # Meta info block
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 10, f"Session Summary: {run.name}", ln=True)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 6, f"Run ID: {str(run.id)}", ln=True)
        pdf.cell(0, 6, f"Status: {run.status.upper()}", ln=True)
        pdf.cell(0, 6, f"Executed: {run.created_at.strftime('%Y-%m-%d %H:%M:%S')} UTC", ln=True)
        pdf.ln(5)
        
        # Summary metrics table
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 10, "Overall Metrics Dashboard", ln=True)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(45, 8, "Total Runs", border=1, align="C")
        pdf.cell(45, 8, "Success Rate", border=1, align="C")
        pdf.cell(45, 8, "Avg Latency", border=1, align="C")
        pdf.cell(45, 8, "Total cost", border=1, align="C", ln=True)
        
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(45, 8, str(run.total_runs), border=1, align="C")
        pdf.cell(45, 8, f"{run.success_rate:.1f}%", border=1, align="C")
        pdf.cell(45, 8, f"{run.avg_latency_ms:.0f} ms", border=1, align="C")
        pdf.cell(45, 8, f"${run.total_token_cost:.6f}", border=1, align="C", ln=True)
        pdf.ln(10)

        # Leaderboard Table
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 10, "Leaderboard - Prompt Reliability rankings", ln=True)
        pdf.set_font("Helvetica", "B", 8)
        pdf.cell(65, 8, "Prompt Benchmark Name", border=1)
        pdf.cell(25, 8, "Type", border=1)
        pdf.cell(20, 8, "Status", border=1, align="C")
        pdf.cell(25, 8, "Latency (ms)", border=1, align="C")
        pdf.cell(20, 8, "Retries", border=1, align="C")
        pdf.cell(25, 8, "Est. Cost ($)", border=1, align="C", ln=True)

        pdf.set_font("Helvetica", "", 8)
        # Sort items: success first, then lowest latency
        sorted_items = sorted(run.items, key=lambda x: (0 if x.status == "success" else 1, x.latency_ms))
        for item in sorted_items:
            pdf.cell(65, 8, item.prompt_name, border=1)
            pdf.cell(25, 8, item.prompt_type.replace("_", " ").title(), border=1)
            
            # Status colors
            if item.status == "success":
                pdf.set_text_color(34, 197, 94) # Green
            else:
                pdf.set_text_color(239, 68, 68) # Red
            pdf.cell(20, 8, item.status.upper(), border=1, align="C")
            pdf.set_text_color(0, 0, 0)
            
            pdf.cell(25, 8, f"{item.latency_ms:,}", border=1, align="C")
            pdf.cell(20, 8, str(item.retries), border=1, align="C")
            pdf.cell(25, 8, f"${item.token_cost:.6f}", border=1, align="C", ln=True)

        return pdf.output()
