// src/app/trending/page.tsx
// Friends’ Trending (deduped per user+movie) + TMDb Trending (posters only)

export const revalidate = 600; // revalidate TMDb section every 10 minutes

import { redis } from "../../lib/redis";

const LIST_KEY = "activity:events";
const ALLOWED = new Set<("rated" | "watchlist_added" | "top5_added")>([
  "rated",
  "watchlist_added",
  "top5_added",
]);

type ActivityEvent = {
  at: number;
  type: "rated" | "watchlist_added" | "watchlist_removed" | "top5_added" | "top5_removed";
  movieId: number;
  username?: string;
  title?: string;
  poster_path?: string | null;
  release_date?: string | null;
};

type TmdbMovie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
};

function posterUrl(p?: string | null, size: "w185" | "w342" = "w185") {
  return p ? `https://image.tmdb.org/t/p/${size}${p}` : "";
}

async function getFriendsTrending(limit = 60) {
  // Read newest events from Redis and dedupe per (username+movieId), skipping items without posters
  const rawList = await redis.lrange<string>(LIST_KEY, 0, 999);
  const seen = new Set<string>();
  const items: ActivityEvent[] = [];

  for (const raw of rawList) {
    let ev: ActivityEvent | null = null;
    try {
      ev = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!ev || !ALLOWED.has(ev.type)) continue;
    if (!ev.movieId || !ev.at) continue;

    const uname = (ev.username || "").toLowerCase();
    if (!uname) continue;
    if (!ev.poster_path) continue; // hide items without posters

    const key = `${uname}:${ev.movieId}`;
    if (seen.has(key)) continue; // keep only the newest per (user+movie)
    seen.add(key);

    items.push(ev);
    if (items.length >= limit) break;
  }

  // Items are already newest-first (list is newest-first)
  return items;
}

async function getTmdbTrending(): Promise<TmdbMovie[]> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return [];
  try {
    const r = await fetch(
      `https://api.themoviedb.org/3/trending/movie/day?api_key=${key}&language=en-US`,
      { next: { revalidate } }
    );
    if (!r.ok) return [];
    const data = await r.json();
    const results: TmdbMovie[] = Array.isArray(data?.results) ? data.results : [];
    // Posters only, take top 20
    return results.filter((m) => !!m.poster_path).slice(0, 20);
  } catch {
    return [];
  }
}

export default async function TrendingPage() {
  const [friends, tmdb] = await Promise.all([getFriendsTrending(60), getTmdbTrending()]);

  return (
    <div className="space-y-8">
      {/* Friends' Trending */}
      <section className="card">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Friends’ Trending</h1>
          <div className="text-xs text-gray-400">
            Newest first • one entry per friend per movie
          </div>
        </div>

        {friends.length === 0 ? (
          <div className="text-gray-400 text-sm">No recent friend activity yet.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {friends.map((it) => {
              const year = it.release_date ? ` (${it.release_date.slice(0, 4)})` : "";
              return (
                <a
                  key={`${it.username}:${it.movieId}`}
                  href={`/movie/${it.movieId}`}
                  className="bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500"
                >
                  <img
                    src={posterUrl(it.poster_path, "w185")}
                    alt={`Poster for ${it.title || "Movie"}${year}`}
                    className="w-full h-auto"
                    loading="lazy"
                  />
                  <div className="p-2 text-sm">
                    <div className="font-medium truncate">{it.title || "Movie"}{year}</div>
                    <div className="text-xs text-gray-400 truncate">@{it.username}</div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>

      {/* TMDb Trending */}
      <section className="card">
        <h2 className="text-xl font-semibold mb-2">TMDb Trending (Today)</h2>
        {tmdb.length === 0 ? (
          <div className="text-gray-400 text-sm">No trending titles right now.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {tmdb.map((m) => {
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
                    <div className="text-xs text-gray-400">Trending</div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
