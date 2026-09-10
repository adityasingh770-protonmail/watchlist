import Link from "next/link";
import {
  ArrowLeft,
  Database,
  ExternalLink,
  Film,
  ImageIcon,
  Star,
} from "lucide-react";

const TMDB_LOGO =
  "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg";

export default function CreditsPage() {
  return (
    <main className="min-h-screen px-5 pb-12 pt-5 sm:px-10 lg:px-16">
      <header className="mx-auto flex max-w-5xl items-center justify-between border-b border-line pb-5">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-gold">
            <Film size={18} />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight">
            frame
          </span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-ink"
        >
          <ArrowLeft size={16} /> Back to watchlist
        </Link>
      </header>

      <section className="mx-auto max-w-5xl py-14 sm:py-20">
        <p className="text-sm font-semibold uppercase tracking-[.18em] text-coral">
          Transparency
        </p>
        <h1 className="mt-3 font-display text-5xl leading-none sm:text-6xl">
          Credits &amp; data sources
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-500">
          Frame is made better by the people and services that help us identify
          great things to watch. Here&apos;s where the information in your
          collection comes from.
        </p>
      </section>

      <section className="mx-auto max-w-5xl">
        <article className="overflow-hidden rounded-3xl border bg-white shadow-card">
          <div className="flex flex-col gap-8 border-b bg-[#E5F6F3] p-7 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#01B4E4]">
                Primary data partner
              </p>
              <h2 className="mt-3 font-display text-4xl font-bold">
                The Movie Database
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-600">
                TMDb provides the movie and TV information that powers title
                search, posters, descriptions, ratings, genres, and
                similar-title recommendations in Frame.
              </p>
            </div>
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5"
            >
              <img
                src={TMDB_LOGO}
                alt="The Movie Database"
                className="h-12 w-auto"
              />
            </a>
          </div>
          <div className="grid gap-6 p-7 sm:grid-cols-3 sm:p-10">
            <div>
              <ImageIcon size={20} className="text-[#01B4E4]" />
              <h3 className="mt-3 font-semibold">Artwork</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                Official posters and title imagery.
              </p>
            </div>
            <div>
              <Star size={20} className="text-[#01B4E4]" />
              <h3 className="mt-3 font-semibold">Metadata</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                Genres, release dates, runtimes, ratings, and vote counts.
              </p>
            </div>
            <div>
              <Database size={20} className="text-[#01B4E4]" />
              <h3 className="mt-3 font-semibold">Discovery</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                Search results and related movie and TV recommendations.
              </p>
            </div>
          </div>
        </article>

        <aside className="mt-6 rounded-2xl border border-dashed bg-white/50 p-6 text-sm leading-relaxed text-zinc-500 sm:p-8">
          <p className="font-semibold text-ink">TMDb attribution</p>
          <p className="mt-2">
            This product uses the TMDB API but is not endorsed or certified by
            TMDB.
          </p>
          <a
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1 font-semibold text-[#01B4E4] hover:underline"
          >
            Visit The Movie Database <ExternalLink size={14} />
          </a>
        </aside>

        <p className="mt-12 text-center text-sm text-zinc-400">
          As Frame grows, every additional data source and attribution will be
          listed here.
        </p>
      </section>
    </main>
  );
}
