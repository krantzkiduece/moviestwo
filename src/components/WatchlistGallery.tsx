"use client";
import { useEffect, useState } from "react";

type Movie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
};

type Item = { movieId: number; title?: string };

function readWatchlist(): number[] {
  try {
    const raw = localStorage.getItem("watchlist");
    const arr = raw ? (JSON.parse(raw) as Item[]) : [];
    const ids = Array.isArray(arr) ? arr.map((i) => i.movieId) : [];
    // unique
    return Array.from(new Set(ids.filter((n) => typeof n === "number" && n > 0)));
  } catch {
    return [];
  }
}

function posterUrl(p: string | null | undefined, size: "w185" | "w342" = "w185") {
  return p
    ? `https://image.tmdb.org/t/p/${size}${p}`
    : "https://via.placeholder.com/185x278?text=No+Poster";
}

// Posters first; then title A→Z
function posterFirstSort(a: Movie, b: Movie) {
  const ap = a.poster_path ? 0 : 1;
  const bp = b.poster_path ? 0 : 1;
  if (ap !== bp) return ap - bp;
  return (a.title || "").localeCompare(b.title || "");
}

export default function WatchlistGallery() {
  const [ids, setIds] = useState<number[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  // Load ids from localStorage
  useEffect(() => {
    setIds(readWatchlist());
  }, []);

  // Refresh when a rating happens (since rating auto-removes from watchlist)
  useEffect(() => {
    const onRated = () => setIds(readWatchlist());
    window.addEventListener("cinecircle:rated", onRated as EventListener);
    return () => window.removeEventListener("cinecircle:rated", onRated as EventListener);
  }, []);

  // Fetch movie details for all ids
  useEffect(() => {
    if (!ids.length) {
      setMovies([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          ids.map(async (id) => {
            const res = await fetch(`/api/tmdb/movie/${id}`);
            if (!res.ok) throw new Error("fetch failed");
            const d = await res.json();
            const m: Movie = {
              id: d.id,
              title: d.title,
              release_date: d.release_date,
              poster_path: d.poster_path,
            };
            return m;
          })
        );
        if (!cancelled) {
          results.sort(posterFirstSort);
          setMovies(results);
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
  }, [ids]);

  if (loading) return <div className="text-gray-300">Loading Watchlist…</div>;
  if (!ids.length) return <div className="text-gray-400">Your Watchlist is empty.</div>;

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
              <div className="font-medium truncate">{m.title}{year}</div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
