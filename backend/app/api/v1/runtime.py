from __future__ import annotations

import os
import uuid
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import FileResponse

from app.core.dependencies import DbSession, LLMProvider, Logger
from app.core.exceptions import not_found, internal_error

router = APIRouter(prefix="/runtime", tags=["Runtime Engine"])


@router.get(
    "/download/{run_id}",
    summary="Download the compiled project as a ZIP file",
    description="Returns the fully packaged React + FastAPI zip archive generated for the specified pipeline run.",
)
async def download_project_zip(
    run_id: str,
    db: DbSession,
    logger: Logger,
) -> FileResponse:
    # 1. Verify run exists
    try:
        run_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run_id format")

    run = await logger.get_run(run_uuid)
    if not run:
        raise not_found(f"Run '{run_id}' not found")

    # 2. Get zip path
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    zip_path = os.path.join(base_dir, "storage", "downloads", f"project_{run_id}.zip")

    if not os.path.exists(zip_path):
        raise not_found(f"ZIP file for run '{run_id}' not found. Verify runtime compilation executed successfully.")

    return FileResponse(
        path=zip_path,
        filename=f"project_{run_id}.zip",
        media_type="application/zip",
    )


@router.get(
    "/file/{run_id}/{filepath:path}",
    summary="Get contents of a specific generated file",
    description="Returns the text content of a compiled codebase file.",
)
async def get_generated_file_content(
    run_id: str,
    filepath: str,
    db: DbSession,
    logger: Logger,
) -> dict:
    try:
        run_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run_id format")

    # Clean file path to prevent directory traversal
    clean_path = os.path.normpath(filepath).lstrip(os.path.sep)
    if clean_path.startswith("..") or os.path.isabs(clean_path):
        raise HTTPException(status_code=400, detail="Invalid file path")

    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    target_file = os.path.join(base_dir, "storage", "generated_projects", run_id, clean_path)

    if not os.path.exists(target_file) or os.path.isdir(target_file):
        raise not_found(f"File '{filepath}' not found in run '{run_id}'")

    try:
        with open(target_file, "r", encoding="utf-8") as f:
            content = f.read()
        return {
            "success": True,
            "data": {
                "path": filepath,
                "content": content,
            }
        }
    except Exception as exc:
        raise internal_error(f"Error reading file: {str(exc)}")
