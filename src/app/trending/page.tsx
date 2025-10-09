// src/app/trending/page.tsx
// Temporary: TMDb-only Trending to unblock builds (no Redis usage)

export const revalidate = 600; // cache TMDb for 10 minutes

type TmdbMovie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
};

function posterUrl(p?: string | null, size: "w185" | "w342" = "w185") {
  return p ? `https://image.tmdb.org/t/p/${size}${p}` : "";
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
    // posters only, top 20
    return results.filter((m) => !!m.poster_path).slice(0, 20);
  } catch {
    return [];
  }
}

export default async function TrendingPage() {
  const tmdb = await getTmdbTrending();

  return (
    <div className="space-y-8">
      <section className="card">
        <h1 className="text-2xl font-bold mb-2">Trending</h1>
        <div className="text-xs text-gray-400 mb-4">TMDb (Today)</div>

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
