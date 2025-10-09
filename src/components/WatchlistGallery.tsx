"use client";
import { useEffect, useState } from "react";

type Item = { movieId: number; title?: string };
type Movie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
};

function getWatchlist(): Item[] {
  try {
    return JSON.parse(localStorage.getItem("watchlist") || "[]");
  } catch {
    return [];
  }
}

function posterUrl(p: string | null | undefined, size: "w185" | "w342" = "w185") {
  return p
    ? `https://image.tmdb.org/t/p/${size}${p}`
    : "https://via.placeholder.com/185x278?text=No+Poster";
}

export default function WatchlistGallery() {
  const [items, setItems] = useState<Item[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  // Load watchlist from localStorage
  useEffect(() => {
    setItems(getWatchlist());
  }, []);

  // Fetch details for each movieId
  useEffect(() => {
    if (!items.length) {
      setMovies([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          items.map(async (it) => {
            const res = await fetch(`/api/tmdb/movie/${it.movieId}`);
            if (!res.ok) throw new Error("fetch failed");
            return res.json();
          })
        );
        if (!cancelled) {
          const ms: Movie[] = results.map((d) => ({
            id: d.id,
            title: d.title,
            release_date: d.release_date,
            poster_path: d.poster_path,
          }));
          setMovies(ms);
        }
      } catch {
        if (!cancelled) setMovies([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [items]);

  if (loading) return <div className="text-gray-300">Loading Watchlist…</div>;
  if (!items.length) {
    return <div className="text-gray-400">Your Watchlist is empty.</div>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
      {movies.map((m) => {
        const year = m.release_date ? ` (${m.release_date.slice(0, 4)})` : "";
        return (
          <a
            key={m.id}
            href={`/movie/${m.id}`}
            className="bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500"
          >
            <img
              src={posterUrl(m.poster_path, "w185")}
              alt={`Poster for ${m.title}${year}`}
              className="w-full h-auto"
              loading="lazy"
            />
            <div className="p-2 text-sm">
              <div className="font-medium truncate">
                {m.title}
                {year}
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
