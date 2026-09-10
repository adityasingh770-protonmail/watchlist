"""Refresh locally saved TMDb titles with current detail metadata.

Run with: uv run python enrich_existing.py
"""

import asyncio

from main import WatchItem, database, enrich_from_tmdb


async def main() -> None:
    with database() as connection:
        rows = connection.execute('SELECT * FROM watchlist WHERE tmdb_id IS NOT NULL').fetchall()

    if not rows:
        print('No TMDb-backed watchlist items found.')
        return

    updated = 0
    for row in rows:
        item = await enrich_from_tmdb(WatchItem(**dict(row)))
        with database() as connection:
            connection.execute(
                '''UPDATE watchlist
                   SET title = ?, year = ?, genre = ?, notes = ?, poster_url = ?, runtime = ?, rating = ?, rating_count = ?
                   WHERE id = ?''',
                (item.title, item.year, item.genre, item.notes, item.poster_url, item.runtime, item.rating, item.rating_count, item.id),
            )
        updated += 1
        print(f'Updated: {item.title}')

    print(f'Enriched {updated} watchlist item(s).')


if __name__ == '__main__':
    asyncio.run(main())
