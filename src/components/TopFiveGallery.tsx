"use client";
import { useEffect, useState } from "react";

type Movie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
};

function readTopFive(): number[] {
  try {
    const raw = localStorage.getItem("top5");
    const arr = raw ? (JSON.parse(raw) as number[]) : [];
    const ids = Array.isArray(arr) ? arr : [];
    // unique, numbers only, max 5
    const uniq = Array.from(new Set(ids.filter((n) => typeof n === "number" && n > 0)));
    return uniq.slice(0, 5);
  } catch {
    return [];
  }
}

function posterUrl(p: string | null | undefined, size: "w185" | "w342" = "w185") {
  return p
    ? `https://image.tmdb.org/t/p/${size}${p}`
    : "https://via.placeholder.com/185x278?text=No+Poster";
}

// Posters first → then title A→Z
function posterFirstSort(a: Movie, b: Movie) {
  const ap = a.poster_path ? 0 : 1;
  const bp = b.poster_path ? 0 : 1;
  if (ap !== bp) return ap - bp;
  return (a.title || "").localeCompare(b.title || "");
}

export default function TopFiveGallery() {
  const [ids, setIds] = useState<number[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  // Load on mount
  useEffect(() => {
    setIds(readTopFive());
  }, []);

  // Refresh when window regains focus or localStorage changes (other tabs)
  useEffect(() => {
    const onFocus = () => setIds(readTopFive());
    const onStorage = (e: StorageEvent) => {
      if (e.key === "top5") setIds(readTopFive());
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // (Optional) When we later dispatch a custom event from the button
  useEffect(() => {
    const onChanged = () => setIds(readTopFive());
    window.addEventListener("cinecircle:top5-changed", onChanged as EventListener);
    return () => window.removeEventListener("cinecircle:top5-changed", onChanged as EventListener);
  }, []);

  // Fetch details for the 0–5 movies
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

  if (loading) return <div className="text-gray-300">Loading Top 5…</div>;
  if (!ids.length) return <div className="text-gray-400">Your Top 5 is empty.</div>;

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
