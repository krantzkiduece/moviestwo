"use client";
import { useEffect, useState } from "react";

type Movie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
};

type RatedItem = {
  movieId: number;
  value: number;      // 0.5–5.0
  updatedAt?: number; // optional timestamp
};

// Read all localStorage entries that start with "rating:"
function readAllRatings(): RatedItem[] {
  const items: RatedItem[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || "";
      if (!key.startsWith("rating:")) continue;
      const idPart = key.split(":")[1];
      const movieId = Number(idPart);
      if (!movieId) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      // Support both old format ("3.5") and new JSON ({value, updatedAt})
      let value = 0;
      let updatedAt: number | undefined = undefined;

      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && "value" in parsed) {
          value = Number(parsed.value);
          if (typeof parsed.updatedAt === "number") updatedAt = parsed.updatedAt;
        } else {
          value = parseFloat(raw);
        }
      } catch {
        value = parseFloat(raw);
      }

      if (!isNaN(value) && value > 0) {
        items.push({ movieId, value, updatedAt });
      }
    }
  } catch {
    // ignore localStorage errors
  }
  return items;
}

function posterUrl(p: string | null | undefined, size: "w185" | "w342" = "w185") {
  return p
    ? `https://image.tmdb.org/t/p/${size}${p}`
    : "https://via.placeholder.com/185x278?text=No+Poster";
}

function SectionHeader({ stars }: { stars: number }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-6">
      <div className="text-yellow-300">
        {"★".repeat(stars)}
        {"☆".repeat(5 - stars)}
      </div>
      <div className="text-gray-300 font-semibold">{stars}-Star</div>
    </div>
  );
}

// Posters first → newest (updatedAt desc) → title A→Z
function posterFirstThenRecentThenTitle(
  a: Movie & { updatedAt?: number },
  b: Movie & { updatedAt?: number }
) {
  const ap = a.poster_path ? 0 : 1;
  const bp = b.poster_path ? 0 : 1;
  if (ap !== bp) return ap - bp;
  const at = a.updatedAt ?? 0;
  const bt = b.updatedAt ?? 0;
  if (bt !== at) return bt - at;
  return (a.title || "").localeCompare(b.title || "");
}

export default function RatedGallery() {
  const [rated, setRated] = useState<RatedItem[]>([]);
  const [byBucket, setByBucket] = useState<
    Record<number, (Movie & { rating: number; updatedAt?: number })[]>
  >({ 1: [], 2: [], 3: [], 4: [], 5: [] });
  const [loading, setLoading] = useState(false);

  // Load ratings from localStorage
  useEffect(() => {
    setRated(readAllRatings());
  }, []);

  // Fetch details and group into buckets (5..1), rounding DOWN (e.g., 4.5 -> 4)
  useEffect(() => {
    if (!rated.length) {
      setByBucket({ 1: [], 2: [], 3: [], 4: [], 5: [] });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          rated.map(async (r) => {
            const res = await fetch(`/api/tmdb/movie/${r.movieId}`);
            if (!res.ok) throw new Error("fetch failed");
            const d = await res.json();
            const m: Movie = {
              id: d.id,
              title: d.title,
              release_date: d.release_date,
              poster_path: d.poster_path,
            };
            // Bucket: round DOWN to an integer 1..5; ignore <1
            const bucket = Math.floor(r.value);
            return { movie: m, rating: r.value, updatedAt: r.updatedAt, bucket };
          })
        );

        if (cancelled) return;

        const grouped: Record<number, (Movie & { rating: number; updatedAt?: number })[]> = {
          1: [],
          2: [],
          3: [],
          4: [],
          5: [],
        };

        for (const item of results) {
          if (!item) continue;
          const b = item.bucket;
          if (b >= 1 && b <= 5) {
            grouped[b].push({
              ...item.movie,
              rating: item.rating,
              updatedAt: item.updatedAt,
            });
          }
        }

        // Sort each bucket: posters first → newest → title
        for (const b of [5, 4, 3, 2, 1]) {
          grouped[b].sort(posterFirstThenRecentThenTitle);
        }

        setByBucket(grouped);
      } catch {
        if (!cancelled) {
          setByBucket({ 1: [], 2: [], 3: [], 4: [], 5: [] });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rated]);

  if (loading) return <div className="text-gray-300">Loading Rated…</div>;
  if (!rated.length)
    return <div className="text-gray-400">You haven’t rated any movies yet.</div>;

  return (
    <div>
      {[5, 4, 3, 2, 1].map((stars) => {
        const items = byBucket[stars] || [];
        if (!items.length) return null;
        return (
          <section key={stars}>
            <SectionHeader stars={stars} />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {items.map((m) => {
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
                      <div className="text-xs text-yellow-300 mt-1">
                        ★ {m.rating.toFixed(1)} / 5
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
