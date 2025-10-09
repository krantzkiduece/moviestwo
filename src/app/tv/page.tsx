export const revalidate = 600; // cache trending for 10 minutess

type TvItem = {
  id: number;
  title: string;
  release_date?: string | null;
  poster_path?: string | null;
};

function posterUrl(p?: string | null, size: "w185" | "w342" = "w185") {
  return p ? `https://image.tmdb.org/t/p/${size}${p}` : "";
}

async function fetchTrendingTV(): Promise<TvItem[]> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return [];
  try {
    const r = await fetch(
      `https://api.themoviedb.org/3/trending/tv/day?api_key=${key}&language=en-US`,
      { next: { revalidate } }
    );
    if (!r.ok) return [];
    const data = await r.json();
    const list = Array.isArray(data?.results) ? data.results : [];
    return list
      .filter((t: any) => t?.poster_path)
      .map((t: any) => ({
        id: t.id,
        title: t.name,
        release_date: t.first_air_date || null,
        poster_path: t.poster_path || null,
      }))
      .slice(0, 24);
  } catch {
    return [];
  }
}

async function searchTV(q: string): Promise<TvItem[]> {
  if (!q.trim()) return [];
  try {
    const r = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/tmdb/tv?q=${encodeURIComponent(q)}`,
      { cache: "no-store" }
    );
    if (!r.ok) return [];
    const data = await r.json();
    const list = Array.isArray(data?.results) ? data.results : [];
    return list;
  } catch {
    // Fallback: call TMDb directly if NEXT_PUBLIC_BASE_URL isn't set
    const key = process.env.TMDB_API_KEY;
    if (!key) return [];
    try {
      const r = await fetch(
        `https://api.themoviedb.org/3/search/tv?api_key=${key}&language=en-US&include_adult=false&page=1&query=${encodeURIComponent(
          q
        )}`,
        { cache: "no-store" }
      );
      if (!r.ok) return [];
      const data = await r.json();
      const list = Array.isArray(data?.results) ? data.results : [];
      return list
        .filter((t: any) => t?.poster_path)
        .map((t: any) => ({
          id: t.id,
          title: t.name,
          release_date: t.first_air_date || null,
          poster_path: t.poster_path || null,
        }))
        .slice(0, 24);
    } catch {
      return [];
    }
  }
}

export default async function TvPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams?.q || "").trim();
  const items = q ? await searchTV(q) : await fetchTrendingTV();

  return (
    <div className="space-y-6">
      <section className="card">
        <form className="flex gap-2" action="/tv" method="get">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search TV shows (e.g., The Office)"
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white rounded px-4"
          >
            Search
          </button>
        </form>
      </section>

      <section className="card">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold">
            {q ? `TV results for “${q}”` : "Trending TV (Today)"}
          </h1>
          {!q && <div className="text-xs text-gray-400">TMDb</div>}
        </div>

        {items.length === 0 ? (
          <div className="text-gray-400 text-sm">No TV shows found.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {items.map((t) => {
              const year = t.release_date ? ` (${t.release_date.slice(0, 4)})` : "";
              // Link to TMDb TV page to avoid adding a new detail page right now
              const href = `https://www.themoviedb.org/tv/${t.id}`;
              return (
                <a
                  key={t.id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500"
                >
                  <img
                    src={posterUrl(t.poster_path, "w185")}
                    alt={`Poster for ${t.title}${year}`}
                    className="w-full h-auto"
                    loading="lazy"
                  />
                  <div className="p-2 text-sm">
                    <div className="font-medium truncate">{t.title}{year}</div>
                    <div className="text-xs text-gray-400">TV Show</div>
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
