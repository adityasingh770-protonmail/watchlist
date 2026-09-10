"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Flame, Sparkles, Star } from "lucide-react";
import { Navbar } from "@/components/navbar";

type DiscoverItem = {
  tmdb_id: number;
  title: string;
  year: number | null;
  media_type: "movie" | "series";
  poster_url: string | null;
  overview: string | null;
  rating: number | null;
  rating_count: number | null;
};
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function Shelf({
  title,
  eyebrow,
  icon,
  items,
  empty,
}: {
  title: string;
  eyebrow: string;
  icon: React.ReactNode;
  items: DiscoverItem[] | null;
  empty: string;
}) {
  return (
    <section className="mb-16">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-coral">
            {icon}
            {eyebrow}
          </p>
          <h2 className="mt-2 font-display text-4xl font-bold">{title}</h2>
        </div>
        <span className="text-sm text-zinc-400">
          {items?.length ?? "…"} titles
        </span>
      </div>
      {items === null ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="aspect-[2/3] animate-pulse rounded-2xl bg-zinc-200"
            />
          ))}
        </div>
      ) : items.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((item) => (
            <article
              key={`${item.media_type}-${item.tmdb_id}`}
              className="group"
            >
              <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-zinc-200 shadow-card">
                <img
                  src={
                    item.poster_url ??
                    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=500&q=80"
                  }
                  alt={`${item.title} poster`}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                {item.rating !== null && (
                  <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-ink/85 px-2 py-1 text-xs font-bold text-white backdrop-blur">
                    <Star size={11} className="fill-gold text-gold" />
                    {item.rating.toFixed(1)}
                  </span>
                )}
              </div>
              <h3 className="mt-3 truncate font-semibold">{item.title}</h3>
              <p className="mt-1 text-xs text-zinc-500">
                {item.year ?? "Coming soon"} ·{" "}
                {item.media_type === "movie" ? "Movie" : "TV series"}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed bg-white/40 px-6 py-12 text-center text-sm text-zinc-500">
          {empty}
        </div>
      )}
    </section>
  );
}

export default function DiscoverPage() {
  const [trending, setTrending] = useState<DiscoverItem[] | null>(null),
    [upcoming, setUpcoming] = useState<DiscoverItem[] | null>(null),
    [similar, setSimilar] = useState<DiscoverItem[] | null>(null);
  useEffect(() => {
    const load = (path: string, setter: (items: DiscoverItem[]) => void) =>
      fetch(`${apiUrl}${path}`)
        .then((r) => (r.ok ? r.json() : []))
        .then(setter)
        .catch(() => setter([]));
    load("/discover/trending", setTrending);
    load("/discover/upcoming", setUpcoming);
    load("/discover/similar", setSimilar);
  }, []);
  return (
    <main className="min-h-screen px-5 pb-12 pt-5 sm:px-10 lg:px-16">
      <Navbar />
      <section className="mx-auto max-w-7xl py-14 sm:py-20">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[.18em] text-coral">
          <Sparkles size={15} /> Find your next favorite
        </p>
        <h1 className="mt-4 max-w-2xl font-display text-5xl leading-none sm:text-6xl">
          Something good is <i>waiting.</i>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-500">
          Freshly picked from what&apos;s finding an audience now, what&apos;s
          arriving soon, and the stories you&apos;ve loved recently.
        </p>
      </section>
      <div className="mx-auto max-w-7xl">
        <Shelf
          title="Trending now"
          eyebrow="The conversation"
          icon={<Flame size={14} />}
          items={trending}
          empty="Nothing is trending right now. Check back soon."
        />
        <Shelf
          title="Coming soon"
          eyebrow="On the horizon"
          icon={<CalendarDays size={14} />}
          items={upcoming}
          empty="No upcoming releases are available right now."
        />
        <Shelf
          title="More like what you watched"
          eyebrow="From your recent history"
          icon={<Sparkles size={14} />}
          items={similar}
          empty="Complete a title in your watchlist to get recommendations based on what you watched in the last 28 days."
        />
      </div>
    </main>
  );
}
