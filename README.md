# Frame

A personal movie and TV watchlist. The frontend uses Next.js, Tailwind CSS, and shadcn-compatible configuration; the API uses FastAPI.

## Run locally

```bash
npm install
npm run dev
```

In another terminal, use the Python 3.14 environment managed by `uv`:

```bash
cd backend
cp .env.example .env
# Edit .env and add your TMDb API Read Access Token
uv sync
uv run uvicorn main:app --reload
```

The UI is available at http://localhost:3000 and API documentation at http://localhost:8000/docs.

Watchlist entries are stored locally in `backend/frame.db` (SQLite). This file persists across frontend refreshes and backend restarts, and is excluded from Git because it is personal local data.

`backend/.python-version` also makes pyenv select Python 3.14.0 when you enter the backend directory. If you prefer pyenv directly, run `pyenv local 3.14.0`, then create a virtual environment with `python -m venv .venv`.

## TMDb integration

Create a TMDb account, generate an **API Read Access Token**, then save it as `TMDB_ACCESS_TOKEN` in `backend/.env`. The browser calls the local FastAPI endpoint, which searches TMDb without exposing that token. The add-title dialog lets you select a matching title and uses its official poster. Add the required TMDb attribution to the app's Credits/About section before publishing.
