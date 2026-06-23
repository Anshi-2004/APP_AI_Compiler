# CompilerAI — Backend

AI-powered Software Compiler backend. Converts natural language prompts into structured, validated, executable application configurations via a deterministic pipeline.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI (async) |
| AI Orchestration | LangChain + structured output |
| LLM | OpenAI GPT-4o (configurable → Gemini) |
| ORM | SQLAlchemy 2.0 async |
| Database | PostgreSQL 16 + asyncpg |
| Migrations | Alembic |
| Settings | pydantic-settings |
| Testing | pytest + pytest-asyncio |

---

## Quick Start

### 1. Start PostgreSQL
```bash
docker-compose up -d
```

### 2. Create virtual environment
```bash
python -m venv .venv
# Windows
.\.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure environment
```bash
copy .env.example .env
# Edit .env — add your OPENAI_API_KEY (or GOOGLE_API_KEY for Gemini)
```

### 5. Run migrations
```bash
alembic upgrade head
```

### 6. Start server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 7. Open API docs
```
http://localhost:8000/docs
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /health | Health check |
| POST | /api/v1/intent/extract | Extract intent from prompt |
| POST | /api/v1/design/generate | Generate system architecture |
| POST | /api/v1/schema/generate | Generate all 5 schemas |
| POST | /api/v1/pipeline/run | **Run full pipeline** |
| GET | /api/v1/pipeline/run/{id} | Get run status |
| GET | /api/v1/logs/{run_id} | Get all stage logs |
| GET | /api/v1/logs/{run_id}/{stage} | Get specific stage log |

---

## Pipeline Flow

```
POST /api/v1/pipeline/run  { "prompt": "..." }
          │
          ▼
   Intent Extraction          → IntentResult (entities, roles, pages, auth, rules)
          │
          ▼
   System Design              → DesignResult (architecture, entity-relations, nav flow)
          │
          ▼
   Schema Generation          → GeneratedSchemas (UI + API + DB + Auth + BizLogic)
          │
          ▼
   Validation Engine          → ValidationReport (checks, severity, cross-layer)
          │
     (if errors)
          ▼
   Repair Engine              → RepairReport (applied/failed fixes)
          │
          ▼
   Runtime Manifest           → RuntimeResult (file tree, pages, APIs, tables)
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | postgresql+asyncpg://... | Async PostgreSQL connection string |
| `LLM_PROVIDER` | `openai` | `openai` or `gemini` |
| `LLM_MODEL` | `gpt-4o` | Model name |
| `LLM_TEMPERATURE` | `0.2` | Generation temperature |
| `OPENAI_API_KEY` | — | Required if `LLM_PROVIDER=openai` |
| `GOOGLE_API_KEY` | — | Required if `LLM_PROVIDER=gemini` |
| `STRICT_MODE` | `false` | Treat warnings as errors |

---

## Running Tests

```bash
# Tests use in-memory SQLite — no DB setup needed
pytest -v
```

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI app factory
│   ├── config.py                # pydantic-settings
│   ├── database.py              # Async SQLAlchemy engine
│   ├── models/                  # ORM tables
│   ├── schemas/                 # Pydantic I/O models
│   ├── services/                # Business logic
│   │   ├── intent_service.py
│   │   ├── design_service.py
│   │   ├── schema_service.py
│   │   ├── validation_service.py
│   │   ├── repair_service.py
│   │   ├── runtime_service.py
│   │   └── orchestrator.py
│   ├── api/v1/                  # Route handlers
│   ├── core/                    # DI, logging, exceptions
│   └── llm/                     # LLM provider abstraction
├── alembic/                     # DB migrations
├── tests/
├── docker-compose.yml
├── requirements.txt
└── .env.example
```
