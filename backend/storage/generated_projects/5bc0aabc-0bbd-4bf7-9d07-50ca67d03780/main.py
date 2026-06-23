from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import routes

app = FastAPI(title="Generated CompilerAI App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router)

@app.get("/health")
def health():
    return {"status": "ok", "app": "compiled-app"}
