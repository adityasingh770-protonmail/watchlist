import os
import sqlite3
import json
import time
from pathlib import Path
from typing import Literal
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()
app = FastAPI(title="Frame API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
DATABASE_PATH = Path(__file__).with_name('frame.db')
TMDB_CACHE_TTL_SECONDS = 60 * 60 * 24 * 90

class WatchItem(BaseModel):
    id: int | None = None
    title: str = Field(min_length=1, max_length=160)
    year: int | None = None
    media_type: Literal['movie', 'series']
    status: Literal['watch_next', 'later', 'in_progress', 'completed'] = 'later'
    genre: str | None = None
    notes: str | None = None
    poster_url: str | None = None
    runtime: str | None = None
    rating: float | None = None
    rating_count: int | None = None
    tmdb_id: int | None = None

class WatchStatusUpdate(BaseModel):
    status: Literal['watch_next', 'later', 'in_progress', 'completed']

class TMDbResult(BaseModel):
    tmdb_id: int
    title: str
    year: int | None = None
    media_type: Literal['movie', 'series']
    poster_url: str | None = None
    overview: str | None = None
    rating: float | None = None
    rating_count: int | None = None

def database() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection

def initialize_database() -> None:
    with database() as connection:
        connection.execute('''
            CREATE TABLE IF NOT EXISTS watchlist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                year INTEGER,
                media_type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'later',
                genre TEXT,
                notes TEXT,
                poster_url TEXT,
                runtime TEXT,
                rating REAL,
                rating_count INTEGER,
                tmdb_id INTEGER
            )
        ''')
        columns = {row['name'] for row in connection.execute('PRAGMA table_info(watchlist)').fetchall()}
        if 'rating_count' not in columns:
            connection.execute('ALTER TABLE watchlist ADD COLUMN rating_count INTEGER')
        connection.execute('''
            CREATE TABLE IF NOT EXISTS tmdb_cache (
                cache_key TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                expires_at INTEGER NOT NULL
            )
        ''')

initialize_database()

async def tmdb_get(path: str, params: dict[str, str | int], ttl_seconds: int = TMDB_CACHE_TTL_SECONDS) -> dict:
    """Return a TMDb response, preferring the persistent SQLite cache."""
    cache_key = json.dumps({'path': path, 'params': params}, sort_keys=True, separators=(',', ':'))
    now = int(time.time())
    with database() as connection:
        cached = connection.execute(
            'SELECT payload FROM tmdb_cache WHERE cache_key = ? AND expires_at > ?', (cache_key, now)
        ).fetchone()
    if cached:
        return json.loads(cached['payload'])

    token = os.getenv('TMDB_ACCESS_TOKEN')
    if not token:
        raise HTTPException(status_code=503, detail='TMDb is not configured. Add TMDB_ACCESS_TOKEN to backend/.env.')
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f'https://api.themoviedb.org/3{path}', params=params,
                headers={'Authorization': f'Bearer {token}', 'accept': 'application/json'},
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as error:
        raise HTTPException(status_code=502, detail='TMDb rejected the request.') from error
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail='Could not reach TMDb.') from error

    payload = response.json()
    with database() as connection:
        connection.execute('DELETE FROM tmdb_cache WHERE expires_at <= ?', (now,))
        connection.execute(
            'INSERT OR REPLACE INTO tmdb_cache (cache_key, payload, expires_at) VALUES (?, ?, ?)',
            (cache_key, json.dumps(payload), now + ttl_seconds),
        )
    return payload

@app.get('/health')
def health(): return {"status": "ok"}

@app.get('/tmdb/search', response_model=list[TMDbResult])
async def search_tmdb(query: str = Query(min_length=2, max_length=100)):
    """Search TMDb without exposing the API token to the browser."""
    payload = await tmdb_get('/search/multi', {'query': query, 'include_adult': 'false', 'language': 'en-US'})

    results: list[TMDbResult] = []
    for result in payload.get('results', []):
        media_type = result.get('media_type')
        if media_type not in ('movie', 'tv'):
            continue
        date = result.get('release_date') or result.get('first_air_date') or ''
        poster_path = result.get('poster_path')
        results.append(TMDbResult(
            tmdb_id=result['id'], title=result.get('title') or result.get('name', 'Untitled'),
            year=int(date[:4]) if len(date) >= 4 and date[:4].isdigit() else None,
            media_type='movie' if media_type == 'movie' else 'series',
            poster_url=f'https://image.tmdb.org/t/p/w500{poster_path}' if poster_path else None,
            overview=result.get('overview') or None,
            rating=round(result['vote_average'], 1) if result.get('vote_average') else None,
            rating_count=result.get('vote_count') or None,
        ))
    return results

@app.get('/tmdb/{media_type}/{tmdb_id}/similar', response_model=list[TMDbResult])
async def get_similar_titles(media_type: Literal['movie', 'series'], tmdb_id: int):
    endpoint = 'movie' if media_type == 'movie' else 'tv'
    payload = await tmdb_get(f'/{endpoint}/{tmdb_id}/similar', {'language': 'en-US', 'page': 1})

    titles: list[TMDbResult] = []
    for result in payload.get('results', [])[:6]:
        date = result.get('release_date') or result.get('first_air_date') or ''
        poster_path = result.get('poster_path')
        titles.append(TMDbResult(
            tmdb_id=result['id'], title=result.get('title') or result.get('name', 'Untitled'),
            year=int(date[:4]) if len(date) >= 4 and date[:4].isdigit() else None,
            media_type=media_type, poster_url=f'https://image.tmdb.org/t/p/w500{poster_path}' if poster_path else None,
            overview=result.get('overview') or None,
            rating=round(result['vote_average'], 1) if result.get('vote_average') else None,
            rating_count=result.get('vote_count') or None,
        ))
    return titles

async def enrich_from_tmdb(item: WatchItem) -> WatchItem:
    """Retrieve detail-only fields before persisting a selected TMDb title."""
    if item.tmdb_id is None:
        return item
    endpoint = 'movie' if item.media_type == 'movie' else 'tv'
    details = await tmdb_get(f'/{endpoint}/{item.tmdb_id}', {'language': 'en-US'})
    date = details.get('release_date') or details.get('first_air_date') or ''
    runtime = details.get('runtime')
    if item.media_type == 'movie' and runtime:
        item.runtime = f'{runtime // 60}h {runtime % 60}m' if runtime >= 60 else f'{runtime}m'
    elif item.media_type == 'series':
        seasons = details.get('number_of_seasons')
        item.runtime = f'{seasons} season' if seasons == 1 else f'{seasons} seasons' if seasons else 'TV series'
    item.title = details.get('title') or details.get('name') or item.title
    item.year = int(date[:4]) if len(date) >= 4 and date[:4].isdigit() else item.year
    item.genre = ' · '.join(genre['name'] for genre in details.get('genres', []) if genre.get('name')) or item.genre
    item.notes = details.get('overview') or item.notes
    item.rating = round(details['vote_average'], 1) if details.get('vote_average') else None
    item.rating_count = details.get('vote_count') or None
    if poster_path := details.get('poster_path'):
        item.poster_url = f'https://image.tmdb.org/t/p/w500{poster_path}'
    return item

@app.get('/watchlist', response_model=list[WatchItem])
def get_watchlist(media_type: str | None = None):
    with database() as connection:
        if media_type:
            rows = connection.execute('SELECT * FROM watchlist WHERE media_type = ? ORDER BY id DESC', (media_type,)).fetchall()
        else:
            rows = connection.execute('SELECT * FROM watchlist ORDER BY id DESC').fetchall()
    return [WatchItem(**dict(row)) for row in rows]

@app.post('/watchlist', response_model=WatchItem, status_code=201)
async def add_to_watchlist(item: WatchItem):
    item = await enrich_from_tmdb(item)
    with database() as connection:
        cursor = connection.execute(
            '''INSERT INTO watchlist (title, year, media_type, status, genre, notes, poster_url, runtime, rating, rating_count, tmdb_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (item.title, item.year, item.media_type, item.status, item.genre, item.notes, item.poster_url, item.runtime, item.rating, item.rating_count, item.tmdb_id),
        )
        item.id = cursor.lastrowid
    return item

@app.patch('/watchlist/{item_id}', response_model=WatchItem)
def update_watch_status(item_id: int, update: WatchStatusUpdate):
    with database() as connection:
        cursor = connection.execute('UPDATE watchlist SET status = ? WHERE id = ?', (update.status, item_id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail='Watchlist item not found')
        row = connection.execute('SELECT * FROM watchlist WHERE id = ?', (item_id,)).fetchone()
    return WatchItem(**dict(row))

@app.delete('/watchlist/{item_id}', status_code=204)
def delete_watch_item(item_id: int):
    with database() as connection:
        cursor = connection.execute('DELETE FROM watchlist WHERE id = ?', (item_id,))
    if cursor.rowcount == 0: raise HTTPException(status_code=404, detail='Watchlist item not found')
