"use client";
import { useEffect, useState } from "react";

type Movie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
};

function getTopFiveIds(): number[] {
  try {
    return JSON.parse(localStorage.getItem("top5") || "[]");
  } catch {
    return [];
  }
}

function posterUrl(p: string | null | undefined, size: "w185" | "w342" = "w185") {
  return p ? `https://image.tmdb.org/t/p/${size}${p}` : "https://via.placeholder.com/185x278?text=No+Poster";
}

export default function TopFiveGallery() {
  const [ids, setIds] = useState<number[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  // Load IDs from localStorage
  useEffect(() => {
    try {
      setIds(getTopFiveIds());
    } catch {
      setIds([]);
    }
  }, []);

  // Fetch details for each ID
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
            return res.json();
          })
        );
        if (!cancelled) {
          // Map to minimal fields for display
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
  }, [ids]);

  if (loading) return <div className="text-gray-300">Loading Top 5…</div>;
  if (!ids.length) {
    return <div className="text-gray-400">No movies in your Top 5 yet.</div>;
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
              <div className="font-medium truncate">{m.title}{year}</div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
