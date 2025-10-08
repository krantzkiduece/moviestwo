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
    const onRated = (e: Event) => {
      const detail = (e as CustomEvent).detail as { movieId: number; rating: number };
      if (detail?.movieId === movieId) {
        const list = getList().filter((i) => i.movieId !== movieId);
        saveList(list);
        setInList(false);
      }
    };
    window.addEventListener("cinecircle:rated", onRated as EventListener);
    return () => window.removeEventListener("cinecircle:rated", onRated as EventListener);
  }, [movieId]);

  const toggle = () => {
    const list = getList();
    if (inList) {
      saveList(list.filter((i) => i.movieId !== movieId));
      setInList(false);
    } else {
      list.push({ movieId, title });
      saveList(list);
      setInList(true);
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
