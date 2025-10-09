// src/components/WatchlistButton.tsx
"use client";

import { useEffect, useState } from "react";
import { syncProfileDebounced } from "../lib/profileSync";

type WatchItem = { movieId: number; title?: string };

function getWatchlist(): WatchItem[] {
  try {
    const raw = localStorage.getItem("watchlist");
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(arr)) return [];
    // normalize
    const out: WatchItem[] = [];
    for (const it of arr) {
      const id = Number((it as any)?.movieId ?? it);
      if (Number.isFinite(id) && id > 0) out.push({ movieId: id, title: (it as any)?.title || undefined });
    }
    // de-dupe by movieId
    const seen = new Set<number>();
    return out.filter((w) => (seen.has(w.movieId) ? false : (seen.add(w.movieId), true)));
  } catch {
    return [];
  }
}

function saveWatchlist(items: WatchItem[]) {
  try {
    localStorage.setItem("watchlist", JSON.stringify(items));
  } catch {}
}

// Broadcast so galleries can refresh
function notifyWatchlistChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cinecircle:watchlist-changed"));
  }
}

async function sendActivity(type: "watchlist_added" | "watchlist_removed", movieId: number) {
  try {
    await fetch("/api/activity/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, movieId }),
    });
  } catch {
    // ignore network errors
  }
}

export default function WatchlistButton({ movieId, title }: { movieId: number; title?: string }) {
  const [inList, setInList] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const items = getWatchlist();
    setInList(items.some((w) => w.movieId === movieId));
  }, [movieId]);

  const toggle = async () => {
    const items = getWatchlist();
    if (!inList) {
      items.unshift({ movieId, title });
      saveWatchlist(items);
      setInList(true);
      setMsg(`Added${title ? ` “${title}”` : ""} to Watchlist.`);
      notifyWatchlistChanged();
      syncProfileDebounced();                 // ✅ auto-sync public profile
      await sendActivity("watchlist_added", movieId);
    } else {
      const next = items.filter((w) => w.movieId !== movieId);
      saveWatchlist(next);
      setInList(false);
      setMsg(`Removed${title ? ` “${title}”` : ""} from Watchlist.`);
      notifyWatchlistChanged();
      syncProfileDebounced();                 // ✅ auto-sync public profile
      await sendActivity("watchlist_removed", movieId);
    }
    setTimeout(() => setMsg(null), 1200);
  };

  return (
    <div>
      <button
        onClick={toggle}
        className={`px-3 py-2 rounded ${inList ? "bg-gray-700" : "bg-emerald-600 hover:bg-emerald-500"}`}
        aria-pressed={inList}
      >
        {inList ? "✓ In Watchlist (remove)" : "+ Add to Watchlist"}
      </button>
      {msg && <div className="text-xs mt-1 text-gray-300">{msg}</div>}
      <div className="text-xs text-gray-500 mt-1">(Auto-synced.)</div>
    </div>
  );
}
