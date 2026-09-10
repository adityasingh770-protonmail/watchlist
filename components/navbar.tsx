"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Film, Sparkles, X } from "lucide-react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function Navbar() {
  const [updateAt, setUpdateAt] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    fetch(`${apiUrl}/discover/updates`)
      .then((response) => (response.ok ? response.json() : []))
      .then((updates: { refreshed_at: number }[]) => {
        const newest = Math.max(
          0,
          ...updates.map((update) => update.refreshed_at),
        );
        const seen = Number(
          window.localStorage.getItem("frame-discover-seen") ?? 0,
        );
        if (newest > seen) setUpdateAt(newest);
      })
      .catch(() => undefined);
  }, []);
  function openNotifications() {
    setIsOpen((open) => !open);
    if (updateAt)
      window.localStorage.setItem("frame-discover-seen", String(updateAt));
  }
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between border-b border-line pb-5">
      <Link href="/" className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-gold">
          <Film size={18} />
        </div>
        <span className="font-display text-2xl font-bold tracking-tight">
          frame
        </span>
      </Link>
      <nav className="hidden items-center gap-8 text-sm text-zinc-500 md:flex">
        <Link href="/">Watchlist</Link>
        <Link href="/discover">Discover</Link>
        <Link href="/credits">Credits</Link>
      </nav>
      <div className="relative flex items-center gap-3">
        <button
          aria-label="Notifications"
          aria-expanded={isOpen}
          onClick={openNotifications}
          className="relative hidden h-9 w-9 place-items-center rounded-full text-zinc-500 hover:bg-white sm:grid"
        >
          <Bell size={18} />
          {updateAt && !isOpen && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-coral ring-2 ring-paper" />
          )}
        </button>
        {isOpen && (
          <div className="absolute right-12 top-12 z-30 hidden w-80 rounded-2xl border bg-white p-4 shadow-xl sm:block">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#FFF0DB] text-coral">
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold">Fresh picks are in</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                    Trending and upcoming titles have been refreshed for you.
                  </p>
                  <Link
                    href="/discover"
                    className="mt-3 inline-block text-sm font-semibold text-coral hover:text-ink"
                  >
                    Explore Discover →
                  </Link>
                </div>
              </div>
              <button
                aria-label="Close notifications"
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
        <div className="grid h-9 w-9 place-items-center rounded-full bg-[#D9D0C6] text-sm font-semibold">
          AR
        </div>
      </div>
    </header>
  );
}
