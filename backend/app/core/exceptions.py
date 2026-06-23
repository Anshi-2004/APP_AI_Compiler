from __future__ import annotations

from fastapi import HTTPException, status


class CompilerBaseError(Exception):
    """Base exception for all domain errors."""

    def __init__(self, message: str, code: str = "COMPILER_ERROR") -> None:
        self.message = message
        self.code = code
        super().__init__(message)


class IntentExtractionError(CompilerBaseError):
    def __init__(self, message: str) -> None:
        super().__init__(message, "INTENT_EXTRACTION_ERROR")


class DesignGenerationError(CompilerBaseError):
    def __init__(self, message: str) -> None:
        super().__init__(message, "DESIGN_GENERATION_ERROR")


class SchemaGenerationError(CompilerBaseError):
    def __init__(self, message: str) -> None:
        super().__init__(message, "SCHEMA_GENERATION_ERROR")


class ValidationError(CompilerBaseError):
    def __init__(self, message: str) -> None:
        super().__init__(message, "VALIDATION_ERROR")


class RepairError(CompilerBaseError):
    def __init__(self, message: str) -> None:
        super().__init__(message, "REPAIR_ERROR")


class PipelineRunNotFoundError(CompilerBaseError):
    def __init__(self, run_id: str) -> None:
        super().__init__(f"Pipeline run '{run_id}' not found", "RUN_NOT_FOUND")


class LLMProviderError(CompilerBaseError):
    def __init__(self, message: str) -> None:
        super().__init__(message, "LLM_PROVIDER_ERROR")


# ── HTTP exception helpers ─────────────────────────────────────────────────────

def not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def internal_error(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail
    )
