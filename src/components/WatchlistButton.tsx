"use client";
import { useEffect, useState } from "react";

type Item = { movieId: number; title?: string };

function getList(): Item[] {
  try {
    return JSON.parse(localStorage.getItem("watchlist") || "[]");
  } catch {
    return [];
  }
}
function saveList(list: Item[]) {
  try {
    localStorage.setItem("watchlist", JSON.stringify(list));
  } catch {}
}

async function sendActivity(type: "watchlist_added" | "watchlist_removed", movieId: number) {
  try {
    await fetch("/api/activity/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, movieId }),
    });
  } catch {
    // ignore network errors; local UI still works
  }
}

export default function WatchlistButton({
  movieId,
  title,
}: {
  movieId: number;
  title?: string;
}) {
  const [inList, setInList] = useState(false);

  // Initialize button state from localStorage
  useEffect(() => {
    const list = getList();
    setInList(list.some((i) => i.movieId === movieId));
  }, [movieId]);

  // Auto-remove from watchlist when this movie is rated
  useEffect(() => {
    const onRated = async (e: Event) => {
      const detail = (e as CustomEvent).detail as { movieId: number; rating: number };
      if (detail?.movieId === movieId) {
        const list = getList().filter((i) => i.movieId !== movieId);
        saveList(list);
        setInList(false);
        await sendActivity("watchlist_removed", movieId);
      }
    };
    window.addEventListener("cinecircle:rated", onRated as EventListener);
    return () => window.removeEventListener("cinecircle:rated", onRated as EventListener);
  }, [movieId]);

  const toggle = async () => {
    const list = getList();
    if (inList) {
      saveList(list.filter((i) => i.movieId !== movieId));
      setInList(false);
      await sendActivity("watchlist_removed", movieId);
    } else {
      list.push({ movieId, title });
      saveList(list);
      setInList(true);
      await sendActivity("watchlist_added", movieId);
    }
  };

  return (
    <button
      onClick={toggle}
      className={`px-3 py-2 rounded ${
        inList ? "bg-gray-700" : "bg-blue-600 hover:bg-blue-500"
      }`}
      aria-pressed={inList}
    >
      {inList ? "✓ In Watchlist (click to remove)" : "＋ Add to Watchlist"}
    </button>
  );
}
