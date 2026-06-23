from fastapi import APIRouter
from app.api.v1 import intent, design, schema, orchestrator, logs, repair, runtime, evaluation

api_router = APIRouter()

api_router.include_router(intent.router)
api_router.include_router(design.router)
api_router.include_router(schema.router)
api_router.include_router(orchestrator.router)
api_router.include_router(logs.router)
api_router.include_router(repair.router)
api_router.include_router(runtime.router)
api_router.include_router(evaluation.router)
