// src/app/u/[username]/page.tsx
// Public profile viewer for a Friend username (e.g., /u/phil)
export const dynamic = "force-dynamic";

import { redis } from "../../../lib/redis";

type Snapshot = {
  username: string;
  updatedAt: number;
  top5: number[];
  watchlist: number[];
  ratings: Record<string, number>;
};

type Friend = { username: string; displayName: string };

type Movie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
};

const DOC_KEY = (u: string) => `profile:${u.toLowerCase()}`;
const FRIEND_KEY = (u: string) => `friend:${u.toLowerCase()}`;

function posterUrl(p: string | null | undefined, size: "w185" | "w342" | "w92" = "w185") {
  return p
    ? `https://image.tmdb.org/t/p/${size}${p}`
    : size === "w92"
    ? "https://via.placeholder.com/92x138?text=No+Poster"
    : "https://via.placeholder.com/185x278?text=No+Poster";
}

// Posters first; then title A→Z
function posterFirstTitle(a: Movie, b: Movie) {
  const ap = a.poster_path ? 0 : 1;
  const bp = b.poster_path ? 0 : 1;
  if (ap !== bp) return ap - bp;
  return (a.title || "").localeCompare(b.title || "");
}

async function fetchMovie(id: number): Promise<Movie | null> {
  try {
    const key = process.env.TMDB_API_KEY!;
    if (!key) return null;
    const r = await fetch(
      `https://api.themoviedb.org/3/movie/${id}?api_key=${key}&language=en-US`,
      { cache: "no-store" }
    );
    if (!r.ok) return null;
    const d = await r.json();
    return {
      id: d.id,
      title: d.title,
      release_date: d.release_date,
      poster_path: d.poster_path ?? null,
    };
  } catch {
    return null;
  }
}

export default async function PublicProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const username = (params.username || "").toLowerCase();

  // Load published snapshot + friendly display name (if any)
  const [rawSnap, rawFriend] = await Promise.all([
    redis.get(DOC_KEY(username)),
    redis.get(FRIEND_KEY(username)),
  ]);

  if (!rawSnap) {
    return (
      <div className="card">
        <h1 className="text-2xl font-bold">Profile not found</h1>
        <p className="text-gray-400 mt-2">
          No published profile for <code>@{username}</code>. Ask the user to publish from <a className="text-blue-400 hover:text-blue-300" href="/profile/me">/profile/me</a>.
        </p>
      </div>
    );
  }

  const snapshot = typeof rawSnap === "string" ? (JSON.parse(rawSnap) as Snapshot) : (rawSnap as Snapshot);
  const friend: Friend | null =
    rawFriend
      ? (typeof rawFriend === "string" ? JSON.parse(rawFriend) : (rawFriend as Friend))
      : null;

  const display = friend?.displayName || username;

  // Fetch details for Top 5 + Watchlist
  const top5Movies = await Promise.all((snapshot.top5 || []).map((id) => fetchMovie(id)));
  const watchMovies = await Promise.all((snapshot.watchlist || []).map((id) => fetchMovie(id)));

  const top5 = (top5Movies.filter(Boolean) as Movie[]).sort(posterFirstTitle);
  const watchlist = (watchMovies.filter(Boolean) as Movie[]).sort(posterFirstTitle);

  // Build Rated buckets (round HALF DOWN, e.g., 4.5 → 4)
  const ratedEntries = Object.entries(snapshot.ratings || {});
  const ratedByBucket: Record<number, (Movie & { rating: number })[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };

  // Fetch each rated movie (only those with rating >0)
  const ratedDetails = await Promise.all(
    ratedEntries.map(async ([idStr, val]) => {
      const movieId = Number(idStr);
      const rating = Number(val);
      if (!movieId || !(rating > 0)) return null;
      const m = await fetchMovie(movieId);
      if (!m) return null;
      const bucket = Math.floor(Math.min(5, Math.max(0.5, Math.round(rating * 2) / 2)));
      if (bucket >= 1 && bucket <= 5) {
        ratedByBucket[bucket].push({ ...m, rating });
      }
      return null;
    })
  );

  // Sort each bucket posters-first, then title
  for (const b of [5, 4, 3, 2, 1]) {
    ratedByBucket[b].sort((a, b) => {
      const ap = a.poster_path ? 0 : 1;
      const bp = b.poster_path ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return (a.title || "").localeCompare(b.title || "");
    });
  }

  const updated = new Date(snapshot.updatedAt).toLocaleString();

  return (
    <div className="space-y-8">
      <section className="card">
        <h1 className="text-2xl font-bold">{display}</h1>
        <div className="text-gray-400 text-sm">
          @{username} • Last published: {updated}
        </div>
        <div className="text-sm mt-2">
          <a className="text-blue-400 hover:text-blue-300" href="/friends">← Back to Friends</a>
        </div>
      </section>

      {/* Top 5 */}
      <section className="card">
        <h2 className="text-xl font-semibold">Top 5</h2>
        {top5.length === 0 ? (
          <div className="text-gray-400 text-sm mt-2">No Top 5 published.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-3">
            {top5.map((m) => {
              const year = m.release_date ? ` (${m.release_date.slice(0, 4)})` : "";
              return (
                <a key={m.id} href={`/movie/${m.id}`} className="bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500">
                  <img src={posterUrl(m.poster_path, "w185")} alt={`Poster for ${m.title}${year}`} className="w-full h-auto" loading="lazy" />
                  <div className="p-2 text-sm">
                    <div className="font-medium truncate">{m.title}{year}</div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>

      {/* Watchlist */}
      <section className="card">
        <h2 className="text-xl font-semibold">Watchlist</h2>
        {watchlist.length === 0 ? (
          <div className="text-gray-400 text-sm mt-2">No Watchlist published.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-3">
            {watchlist.map((m) => {
              const year = m.release_date ? ` (${m.release_date.slice(0, 4)})` : "";
              return (
                <a key={m.id} href={`/movie/${m.id}`} className="bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500">
                  <img src={posterUrl(m.poster_path, "w185")} alt={`Poster for ${m.title}${year}`} className="w-full h-auto" loading="lazy" />
                  <div className="p-2 text-sm">
                    <div className="font-medium truncate">{m.title}{year}</div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>

      {/* Rated (grouped 5★ → 1★, rounding halves DOWN) */}
      <section className="card">
        <h2 className="text-xl font-semibold">Rated</h2>
        {[5, 4, 3, 2, 1].map((stars) => {
          const items = ratedByBucket[stars] || [];
          if (!items.length) return null;
          return (
            <div key={stars} className="mt-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-yellow-300">
                  {"★".repeat(stars)}
                  {"☆".repeat(5 - stars)}
                </div>
                <div className="text-gray-300 font-semibold">{stars}-Star</div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {items.map((m) => {
                  const year = m.release_date ? ` (${m.release_date.slice(0, 4)})` : "";
                  return (
                    <a key={m.id} href={`/movie/${m.id}`} className="bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500">
                      <img src={posterUrl(m.poster_path, "w185")} alt={`Poster for ${m.title}${year}`} className="w-full h-auto" loading="lazy" />
                      <div className="p-2 text-sm">
                        <div className="font-medium truncate">{m.title}{year}</div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
