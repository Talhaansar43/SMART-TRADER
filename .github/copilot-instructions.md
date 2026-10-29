# Copilot Instructions: Smart Trader

Use this file as the short, stable project map. Check the relevant implementation before relying on these notes; do not reread broad docs when a targeted file answers the question.

## Stack and entry points
- Frontend: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS. Pages are in `frontend/app`; shared UI in `frontend/components`; API client and utilities in `frontend/lib`; shared types in `frontend/types`.
- Backend: Python 3.11, FastAPI, SQLAlchemy. App code is under `backend/app`: routers in `api/routes`, business logic in `services`, models in `models`; `main.py` mounts the routers.
- API routes use `/api/market`, `/api/portfolio`, `/api/trades`, and `/api/analysis`. Health check: `/health`.
- Frontend API base URL is `NEXT_PUBLIC_API_URL`, defaulting to `http://localhost:8000` (`frontend/lib/api-client.ts`).
- Backend settings are in `backend/app/config.py`; `.env` is loaded from the backend working directory. Relevant keys include `DATABASE_URL`, `FINNHUB_API_KEY`, `OPENAI_API_KEY`, and `REDIS_URL`. Never put real secrets in source or instructions.

## Runtime notes
- Windows frontend: `cd frontend`, `npm install` if needed, then `npm run dev` (http://localhost:3000).
- Windows backend: from the repo root, run `backend\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` with working directory `backend`. Create that venv with `py -3.11 -m venv venv`; install `requirements.txt` into it first.
- Root `backend-dev` uses POSIX `source venv/bin/activate`; use the Windows command above in PowerShell.
- API docs: `http://localhost:8000/docs`.
- Market data and caching live in `backend/app/services/market_service.py`. Redis is optional: the service attempts `localhost:6379`, caches price/history/search data for 300 seconds when available, and continues without cache when unavailable. Although `REDIS_URL` exists in settings, this service currently hardcodes the Redis host. Finnhub failures fall back to mock data where available.

## Change conventions
- Follow local style and preserve existing API shapes unless the task requires a contract change. Check callers and types when changing an endpoint or shared type.
- Use exact decimal arithmetic for new financial calculations where rounding matters; do not blindly change existing API values without checking consumers.
- Reuse current dependencies and patterns. Add a dependency only when needed and update the appropriate manifest/lockfile.
- Keep credentials in environment configuration. Use the project logger in backend paths; avoid production debug prints and frontend console logging.
- Locate the existing test/build setup before adding tests. Run the narrowest relevant check first, then broader required checks when the change warrants them.

## Token-efficient workflow
- Start from the named file, symbol, failing behavior, or route. Read only its implementation and the nearest caller/test needed to establish the behavior.
- Search for references before changing shared code; avoid loading whole directories or repeating context already present in this file.
- Prefer small, local edits and focused validation. Expand exploration only when the local evidence leaves a concrete question unresolved.
- Treat the README as overview, not authoritative file structure; verify paths and commands against the current workspace.

## Chat context management
- By default, use only the last 5 conversation turns as conversational context for the current request.
- Append `#ctx:N` to a request to override the default for that request and use the last N conversation turns (for example, `#ctx:3` or `#ctx:10`).
- Apply an override only to the request that includes it; return to the 5-turn default on the next request.
