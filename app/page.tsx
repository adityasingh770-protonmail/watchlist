"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  Clock3,
  Film,
  Grid2X2,
  LayoutList,
  Plus,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";

type Item = {
  id: number;
  title: string;
  year: string;
  type: "Movie" | "Series";
  genre: string;
  runtime: string;
  score: string;
  ratingCount: number | null;
  description: string | null;
  tmdbId?: number | null;
  image: string;
  status: "Watch next" | "Later" | "In progress" | "Completed";
};
type TMDbResult = {
  tmdb_id: number;
  title: string;
  year: number | null;
  media_type: "movie" | "series";
  poster_url: string | null;
  overview: string | null;
  rating: number | null;
  rating_count: number | null;
};
type StoredItem = {
  id: number;
  title: string;
  year: number | null;
  media_type: "movie" | "series";
  status: "watch_next" | "later" | "in_progress" | "completed";
  genre: string | null;
  notes: string | null;
  runtime: string | null;
  rating: number | null;
  rating_count: number | null;
  poster_url: string | null;
  tmdb_id: number | null;
};
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const fallbackPoster =
  "https://images.unsplash.com/photo-1485095329183-d0797cdc5676?auto=format&fit=crop&w=700&q=85";
const initialItems: Item[] = [
  {
    id: 1,
    title: "Past Lives",
    year: "2023",
    type: "Movie",
    genre: "Romance · Drama",
    runtime: "1h 46m",
    score: "7.8",
    ratingCount: null,
    description: null,
    status: "Watch next",
    image:
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=85",
  },
  {
    id: 2,
    title: "The Bear",
    year: "2022",
    type: "Series",
    genre: "Comedy · Drama",
    runtime: "3 seasons",
    score: "8.6",
    ratingCount: null,
    description: null,
    status: "In progress",
    image:
      "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=700&q=85",
  },
  {
    id: 3,
    title: "Anatomy of a Fall",
    year: "2023",
    type: "Movie",
    genre: "Crime · Drama",
    runtime: "2h 32m",
    score: "7.7",
    ratingCount: null,
    description: null,
    status: "Watch next",
    image:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=700&q=85",
  },
  {
    id: 4,
    title: "Shōgun",
    year: "2024",
    type: "Series",
    genre: "Adventure · Drama",
    runtime: "1 season",
    score: "8.7",
    ratingCount: null,
    description: null,
    status: "Later",
    image:
      "https://images.unsplash.com/photo-1533928298208-27ff66555d8d?auto=format&fit=crop&w=700&q=85",
  },
];
function formatRatingCount(value: number | null) {
  return value === null
    ? null
    : new Intl.NumberFormat("en", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);
}
function cardFromStored(item: StoredItem): Item {
  return {
    id: item.id,
    title: item.title,
    year: String(item.year ?? "—"),
    type: item.media_type === "movie" ? "Movie" : "Series",
    genre: item.genre ?? "From TMDb",
    runtime:
      item.runtime ?? (item.media_type === "movie" ? "Movie" : "TV series"),
    score: item.rating?.toFixed(1) ?? "—",
    ratingCount: item.rating_count,
    description: item.notes,
    tmdbId: item.tmdb_id,
    image: item.poster_url ?? fallbackPoster,
    status:
      item.status === "watch_next"
        ? "Watch next"
        : item.status === "in_progress"
          ? "In progress"
          : item.status === "completed"
            ? "Completed"
            : "Later",
  };
}

export default function Home() {
  const [items, setItems] = useState(initialItems),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All"),
    [collection, setCollection] = useState<"watchlist" | "watched">(
      "watchlist",
    ),
    [view, setView] = useState<"grid" | "list">("grid");
  const [showAdd, setShowAdd] = useState(false),
    [title, setTitle] = useState(""),
    [results, setResults] = useState<TMDbResult[]>([]),
    [selected, setSelected] = useState<TMDbResult | null>(null),
    [searching, setSearching] = useState(false),
    [searchError, setSearchError] = useState(""),
    [statusMenuId, setStatusMenuId] = useState<number | null>(null),
    [flippedId, setFlippedId] = useState<number | null>(null),
    [similar, setSimilar] = useState<Record<number, TMDbResult[]>>({}),
    [similarLoadingId, setSimilarLoadingId] = useState<number | null>(null);
  const visible = useMemo(
    () =>
      items.filter(
        (i) =>
          (collection === "watched"
            ? i.status === "Completed"
            : i.status !== "Completed") &&
          (filter === "All" || i.type === filter) &&
          i.title.toLowerCase().includes(query.toLowerCase()),
      ),
    [items, filter, query, collection],
  );
  const watchedCount = items.filter(
    (item) => item.status === "Completed",
  ).length;
  const watchlistCount = items.length - watchedCount;

  useEffect(() => {
    fetch(`${apiUrl}/watchlist`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Watchlist could not be loaded");
        return response.json() as Promise<StoredItem[]>;
      })
      .then((saved) => setItems(saved.map(cardFromStored)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!showAdd || title.trim().length < 2) {
      setResults([]);
      setSearchError("");
      return;
    }
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError("");
      try {
        const response = await fetch(
          `${apiUrl}/tmdb/search?query=${encodeURIComponent(title)}`,
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Search failed");
        setResults(data);
      } catch (error) {
        setResults([]);
        setSearchError(
          error instanceof Error ? error.message : "Search failed",
        );
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [title, showAdd]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const newItem: Item = {
      id: Date.now(),
      title: selected.title,
      year: String(selected.year ?? "—"),
      type: selected.media_type === "movie" ? "Movie" : "Series",
      genre: "Loading details…",
      runtime: selected.media_type === "movie" ? "Movie" : "TV series",
      score: selected.rating?.toFixed(1) ?? "—",
      ratingCount: selected.rating_count,
      description: selected.overview,
      tmdbId: selected.tmdb_id,
      status: "Later",
      image: selected.poster_url ?? fallbackPoster,
    };
    setItems([newItem, ...items]);
    setTitle("");
    setSelected(null);
    setResults([]);
    setShowAdd(false);
    try {
      const response = await fetch(`${apiUrl}/watchlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selected.title,
          year: selected.year,
          media_type: selected.media_type,
          status: "later",
          genre: "From TMDb",
          poster_url: selected.poster_url,
          tmdb_id: selected.tmdb_id,
        }),
      });
      if (response.ok) {
        const saved: StoredItem = await response.json();
        setItems((current) =>
          current.map((item) =>
            item.id === newItem.id ? cardFromStored(saved) : item,
          ),
        );
      }
    } catch {
      /* Keep the temporary card visible if the local API is offline. */
    }
  }
  function removeItem(id: number) {
    setItems(items.filter((i) => i.id !== id));
    fetch(`${apiUrl}/watchlist/${id}`, { method: "DELETE" }).catch(
      () => undefined,
    );
  }
  function updateStatus(id: number, status: Item["status"]) {
    setStatusMenuId(null);
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item)),
    );
    const apiStatus =
      status === "Watch next"
        ? "watch_next"
        : status === "In progress"
          ? "in_progress"
          : status === "Completed"
            ? "completed"
            : "later";
    fetch(`${apiUrl}/watchlist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: apiStatus }),
    }).catch(() => undefined);
  }
  function closeAdd() {
    setShowAdd(false);
    setTitle("");
    setSelected(null);
    setResults([]);
    setSearchError("");
  }
  async function loadSimilar(item: Item) {
    if (!item.tmdbId || similar[item.id]) return;
    setSimilarLoadingId(item.id);
    try {
      const mediaType = item.type === "Movie" ? "movie" : "series";
      const response = await fetch(
        `${apiUrl}/tmdb/${mediaType}/${item.tmdbId}/similar`,
      );
      if (!response.ok) throw new Error("Similar titles could not be loaded");
      const titles: TMDbResult[] = await response.json();
      setSimilar((current) => ({ ...current, [item.id]: titles }));
    } finally {
      setSimilarLoadingId(null);
    }
  }
  function flipCard(id: number) {
    if (window.getSelection()?.toString()) return;
    setFlippedId(id);
  }

  return (
    <main className="min-h-screen px-5 pb-10 pt-5 sm:px-10 lg:px-16">
      <header className="mx-auto flex max-w-7xl items-center justify-between border-b border-line pb-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-gold">
            <Film size={18} />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight">
            frame
          </span>
        </div>
        <nav className="hidden items-center gap-8 text-sm text-zinc-500 md:flex">
          <a className="font-medium text-ink" href="#watchlist">
            Watchlist
          </a>
          <a href="#discover">Discover</a>
          <a href="/credits">Credits</a>
        </nav>
        <div className="flex items-center gap-3">
          <button className="hidden h-9 w-9 place-items-center rounded-full text-zinc-500 hover:bg-white sm:grid">
            <Bell size={18} />
          </button>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#D9D0C6] text-sm font-semibold">
            AR
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-7xl py-12 sm:py-16">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[.18em] text-coral">
          <Sparkles size={15} /> Your collection
        </p>
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-5xl leading-none sm:text-6xl">
              Good things, <i>queued.</i>
            </h1>
            <p className="mt-5 max-w-md text-zinc-500">
              A home for every film and show you&apos;re saving for the right
              night.
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800"
          >
            <Plus size={17} /> Add to watchlist
          </button>
        </div>
      </section>
      <section id="watchlist" className="mx-auto max-w-7xl">
        <div className="mb-5 flex w-fit gap-1 rounded-xl bg-[#ECEBE7] p-1">
          <button
            onClick={() => setCollection("watchlist")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${collection === "watchlist" ? "bg-white text-ink shadow-sm" : "text-zinc-500"}`}
          >
            Watchlist · {watchlistCount}
          </button>
          <button
            onClick={() => setCollection("watched")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${collection === "watched" ? "bg-white text-ink shadow-sm" : "text-zinc-500"}`}
          >
            Watched · {watchedCount}
          </button>
        </div>
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex gap-1 rounded-xl bg-[#ECEBE7] p-1">
            {["All", "Movie", "Series"].map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${filter === t ? "bg-white text-ink shadow-sm" : "text-zinc-500"}`}
              >
                {t === "All"
                  ? `All titles · ${visible.length}`
                  : t === "Movie"
                    ? "Movies"
                    : "TV shows"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex h-10 items-center gap-2 rounded-xl border bg-white px-3 text-zinc-400">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search titles"
                className="w-32 bg-transparent text-sm text-ink outline-none sm:w-44"
              />
            </label>
            <button
              onClick={() => setView(view === "grid" ? "list" : "grid")}
              className="grid h-10 w-10 place-items-center rounded-xl border bg-white text-zinc-500"
            >
              {view === "grid" ? (
                <LayoutList size={17} />
              ) : (
                <Grid2X2 size={17} />
              )}
            </button>
          </div>
        </div>
        <div
          className={
            view === "grid"
              ? "columns-1 gap-5 sm:columns-2 lg:columns-3"
              : "grid gap-3"
          }
        >
          {visible.map((item) => (
            <article
              key={item.id}
              className={`group overflow-visible rounded-2xl border bg-white shadow-card transition hover:-translate-y-1 hover:shadow-lg ${view === "grid" ? "mb-5 break-inside-avoid" : ""} ${flippedId === item.id ? "card-flip p-5" : view === "list" ? "flex h-36" : ""}`}
            >
              {flippedId === item.id ? (
                <div
                  onClick={() => setFlippedId(null)}
                  className="flex min-h-64 flex-1 cursor-pointer flex-col"
                >
                  <h2 className="font-display text-3xl font-bold leading-none">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-500">
                    {item.year} · {item.genre}
                  </p>
                  <p className="mt-5 text-sm leading-relaxed text-zinc-600">
                    {item.description ??
                      "A description is not available for this title."}
                  </p>
                  {item.tmdbId ? (
                    <div className="mt-auto pt-6">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          loadSimilar(item);
                        }}
                        className="rounded-full bg-ink px-4 py-2 text-xs font-bold text-white"
                      >
                        {similarLoadingId === item.id
                          ? "Finding similar titles…"
                          : "Show similar titles"}
                      </button>
                      {similar[item.id] && (
                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {similar[item.id].map((title) => (
                            <div key={title.tmdb_id} className="min-w-0">
                              <img
                                src={title.poster_url ?? fallbackPoster}
                                alt=""
                                className="aspect-[2/3] w-full rounded-lg object-cover"
                              />
                              <p className="mt-1 truncate text-xs font-semibold">
                                {title.title}
                              </p>
                              <p className="text-[11px] text-zinc-500">
                                {title.year ?? "—"}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-auto pt-6 text-xs text-zinc-400">
                      Similar titles are available for TMDb-backed cards.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div
                    onClick={() => flipCard(item.id)}
                    className={`relative overflow-hidden bg-zinc-200 ${view === "list" ? "w-48 shrink-0" : "aspect-[16/10] rounded-t-2xl"}`}
                  >
                    <img
                      src={item.image}
                      alt={`${item.title} poster`}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold backdrop-blur">
                      {item.type}
                    </span>
                    <button
                      aria-label={`Remove ${item.title}`}
                      onClick={() => removeItem(item.id)}
                      className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/30 text-white opacity-0 backdrop-blur transition group-hover:opacity-100"
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div
                      onClick={() => flipCard(item.id)}
                      className="flex cursor-pointer items-start justify-between gap-3"
                    >
                      <div>
                        <h2 className="font-display text-2xl font-bold leading-none">
                          {item.title}
                        </h2>
                        <p className="mt-2 text-sm text-zinc-500">
                          {item.year} · {item.genre}
                        </p>
                      </div>
                      <span
                        title={
                          item.ratingCount
                            ? `TMDb rating based on ${item.ratingCount.toLocaleString()} votes`
                            : "TMDb rating"
                        }
                        className="flex shrink-0 items-center gap-1 text-sm font-semibold"
                      >
                        <Star size={14} className="fill-gold text-gold" />
                        {item.score}
                        {formatRatingCount(item.ratingCount) && (
                          <span className="text-xs font-normal text-zinc-400">
                            ({formatRatingCount(item.ratingCount)})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-5 text-xs font-medium text-zinc-500">
                      <span className="flex items-center gap-1.5">
                        <Clock3 size={14} />
                        {item.runtime}
                      </span>
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          aria-expanded={statusMenuId === item.id}
                          aria-label={`Change status for ${item.title}`}
                          onClick={() =>
                            setStatusMenuId(
                              statusMenuId === item.id ? null : item.id,
                            )
                          }
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${item.status === "Watch next" ? "bg-[#FFF0DB] text-[#A65C00]" : item.status === "In progress" ? "bg-[#E5F1EB] text-[#207347]" : item.status === "Completed" ? "bg-[#E8EAF8] text-[#4454A5]" : "bg-[#F0EEEA] text-zinc-600"}`}
                        >
                          {item.status}
                          <ChevronDown size={12} />
                        </button>
                        {statusMenuId === item.id && (
                          <div className="absolute bottom-full right-0 z-10 mb-2 w-32 rounded-xl border bg-white p-1 shadow-lg">
                            {(
                              [
                                "Watch next",
                                "Later",
                                "In progress",
                                "Completed",
                              ] as Item["status"][]
                            ).map((status) => (
                              <button
                                type="button"
                                key={status}
                                onClick={() => updateStatus(item.id, status)}
                                className={`block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-[#F7F7F5] ${status === item.status ? "font-bold text-ink" : "text-zinc-600"}`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
        {visible.length === 0 && (
          <div className="rounded-2xl border border-dashed py-20 text-center text-zinc-500">
            {collection === "watched"
              ? "No completed titles yet."
              : "Nothing found in your watchlist."}
          </div>
        )}
      </section>
      <section
        id="discover"
        className="mx-auto mt-16 max-w-7xl rounded-3xl bg-ink px-7 py-8 text-white sm:px-10"
      >
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-gold">
              For your next evening
            </p>
            <h2 className="font-display text-3xl">Not sure where to start?</h2>
            <p className="mt-2 text-sm text-zinc-400">
              We&apos;ll surface something from your saved list.
            </p>
          </div>
          <button
            onClick={() => setFilter("Movie")}
            className="rounded-full bg-gold px-5 py-3 text-sm font-bold text-ink"
          >
            Pick a movie for me
          </button>
        </div>
      </section>
      <footer className="mx-auto mt-8 max-w-7xl text-center text-xs text-zinc-400">
        <a href="/credits" className="hover:text-ink">
          Credits &amp; data sources
        </a>
      </footer>
      {showAdd && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-ink/35 p-5 backdrop-blur-sm">
          <form
            onSubmit={addItem}
            className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-display text-3xl font-bold">Add a title</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Search TMDb and choose the right match.
                </p>
              </div>
              <button aria-label="Close" type="button" onClick={closeAdd}>
                <X size={20} />
              </button>
            </div>
            <label className="text-sm font-semibold">
              Search TMDb
              <input
                autoFocus
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setSelected(null);
                }}
                placeholder="e.g. Moonlight"
                className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-ink"
              />
            </label>
            {searching && (
              <p className="py-4 text-sm text-zinc-500">Searching TMDb…</p>
            )}
            {searchError && (
              <p className="py-4 text-sm text-coral">{searchError}</p>
            )}
            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {results.map((result) => (
                <button
                  type="button"
                  key={`${result.media_type}-${result.tmdb_id}`}
                  onClick={() => setSelected(result)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${selected?.tmdb_id === result.tmdb_id ? "border-ink bg-[#F7F7F5]" : "hover:bg-[#F7F7F5]"}`}
                >
                  <img
                    src={result.poster_url ?? fallbackPoster}
                    alt=""
                    className="h-14 w-10 rounded-md object-cover"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {result.title}
                    </span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      {result.year ?? "Year unavailable"} ·{" "}
                      {result.media_type === "movie" ? "Movie" : "TV series"}
                    </span>
                    {result.overview && (
                      <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-zinc-500">
                        {result.overview}
                      </span>
                    )}
                  </span>
                  {result.rating !== null && (
                    <span className="ml-auto flex shrink-0 items-center gap-1 text-xs font-semibold text-zinc-600">
                      <Star size={12} className="fill-gold text-gold" />
                      {result.rating.toFixed(1)}
                    </span>
                  )}
                  {selected?.tmdb_id === result.tmdb_id && (
                    <span className="ml-2 text-xs font-bold text-coral">
                      Selected
                    </span>
                  )}
                </button>
              ))}
            </div>
            {title.length >= 2 &&
              !searching &&
              !searchError &&
              results.length === 0 && (
                <p className="py-4 text-sm text-zinc-500">No titles found.</p>
              )}
            <button
              disabled={!selected}
              className="mt-6 w-full rounded-xl bg-ink py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              Save to watchlist
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
