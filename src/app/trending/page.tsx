// src/app/trending/page.tsx
// Shows two sections:
// 1) TMDb global trending (read via TMDb key)
// 2) Friends' Trending (latest activity stored in Upstash Redis)

export const revalidate = 3600; // revalidate TMDb section hourly

import { redis } from "../../lib/redis";

type Movie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
};

type Event = {
  at: number; // timestamp (ms)
  type: "rated" | "watchlist_added" | "top5_added" | "watchlist_removed" | "top5_removed";
  movieId: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
};

function posterUrl(p: string | null | undefined, size: "w185" | "w342" | "w92" = "w185") {
  return p
    ? `https://image.tmdb.org/t/p/${size}${p}`
    : size === "w92"
      ? "https://via.placeholder.com/92x138?text=No+Poster"
      : "https://via.placeholder.com/185x278?text=No+Poster";
}

async function getTmdbTrending(): Promise<Movie[]> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return [];
  const url = `https://api.themoviedb.org/3/trending/movie/day?api_key=${key}&language=en-US`;
  try {
    const r = await fetch(url, { next: { revalidate } });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data?.results) ? (data.results as Movie[]) : [];
  } catch {
    return [];
  }
}

async function getFriendsTrending(): Promise<Event[]> {
  try {
    // Read most recent 50 events directly from Redis (same as GET /api/activity/recent)
    const raw = await redis.lrange<string>("activity", 0, 49);
    const events: Event[] = [];
    for (const s of raw) {
      try {
        const e = JSON.parse(s) as Event;
        if (e && typeof e.movieId === "number" && typeof e.at === "number") {
          events.push(e);
        }
      } catch {
        // ignore malformed
      }
    }
    return events;
  } catch {
    // Redis not available or misconfigured
    return [];
  }
}

export default async function TrendingPage() {
  const [tmdb, friends] = await Promise.all([getTmdbTrending(), getFriendsTrending()]);

  return (
    <div className="space-y-10">
      {/* TMDb Trending */}
      <section className="card">
        <h2 className="text-xl font-semibold">🔥 TMDb Trending</h2>
        <p className="text-gray-400 text-sm mb-4">
          Global trending movies (from TMDb).
        </p>
        {tmdb.length === 0 ? (
          <div className="text-gray-400">No trending results available.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {tmdb.slice(0, 18).map((m) => {
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
        )}
      </section>

      {/* Friends' Trending */}
      <section className="card">
        <h2 className="text-xl font-semibold">👥 Friends’ Trending</h2>
        <p className="text-gray-400 text-sm mb-4">
          Latest activity from everyone using this app (ratings, watchlist, Top 5).
        </p>

        {friends.length === 0 ? (
          <div className="text-gray-400">
            No recent friend activity yet. Rate a movie, add to your Watchlist, or add to Top 5 to see it here.
          </div>
        ) : (
          <ul className="divide-y divide-gray-700">
            {friends.map((e, idx) => {
              const year = e.release_date ? ` (${e.release_date.slice(0, 4)})` : "";
              const label =
                e.type === "rated"
                  ? "Rated"
                  : e.type === "watchlist_added"
                  ? "Added to Watchlist"
                  : e.type === "watchlist_removed"
                  ? "Removed from Watchlist"
                  : e.type === "top5_added"
                  ? "Added to Top 5"
                  : "Removed from Top 5";

              const when = new Date(e.at).toLocaleString();

              return (
                <li key={idx} className="py-3">
                  <a href={`/movie/${e.movieId}`} className="flex items-center gap-3 hover:opacity-90">
                    <img
                      src={posterUrl(e.poster_path, "w92")}
                      alt={`Poster for ${e.title}${year}`}
                      className="w-12 h-auto rounded"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">
                        <span className="font-medium">{e.title}{year}</span>
                      </div>
                      <div className="text-xs text-gray-400">{label} • {when}</div>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
