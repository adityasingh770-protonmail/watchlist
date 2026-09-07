import os
import sqlite3
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
                tmdb_id INTEGER
            )
        ''')

initialize_database()

@app.get('/health')
def health(): return {"status": "ok"}

@app.get('/tmdb/search', response_model=list[TMDbResult])
async def search_tmdb(query: str = Query(min_length=2, max_length=100)):
    """Search TMDb without exposing the API token to the browser."""
    token = os.getenv('TMDB_ACCESS_TOKEN')
    if not token:
        raise HTTPException(status_code=503, detail='TMDb is not configured. Add TMDB_ACCESS_TOKEN to backend/.env.')

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                'https://api.themoviedb.org/3/search/multi',
                params={'query': query, 'include_adult': 'false', 'language': 'en-US'},
                headers={'Authorization': f'Bearer {token}', 'accept': 'application/json'},
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as error:
        raise HTTPException(status_code=502, detail='TMDb rejected the search request.') from error
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail='Could not reach TMDb.') from error

    results: list[TMDbResult] = []
    for result in response.json().get('results', []):
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
        ))
    return results

@app.get('/watchlist', response_model=list[WatchItem])
def get_watchlist(media_type: str | None = None):
    with database() as connection:
        if media_type:
            rows = connection.execute('SELECT * FROM watchlist WHERE media_type = ? ORDER BY id DESC', (media_type,)).fetchall()
        else:
            rows = connection.execute('SELECT * FROM watchlist ORDER BY id DESC').fetchall()
    return [WatchItem(**dict(row)) for row in rows]

@app.post('/watchlist', response_model=WatchItem, status_code=201)
def add_to_watchlist(item: WatchItem):
    with database() as connection:
        cursor = connection.execute(
            '''INSERT INTO watchlist (title, year, media_type, status, genre, notes, poster_url, runtime, rating, tmdb_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (item.title, item.year, item.media_type, item.status, item.genre, item.notes, item.poster_url, item.runtime, item.rating, item.tmdb_id),
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
