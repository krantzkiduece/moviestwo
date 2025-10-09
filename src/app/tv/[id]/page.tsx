// src/app/tv/[id]/page.tsx
export const revalidate = 1800; // 30 minutes

type TvDetails = {
  id: number;
  name: string;
  overview?: string | null;
  first_air_date?: string | null;
  poster_path?: string | null;
  genres?: { id: number; name: string }[];
  number_of_seasons?: number | null;
  number_of_episodes?: number | null;
};

type Credits = {
  cast?: { id: number; name: string; character?: string | null; profile_path?: string | null }[];
};

function posterUrl(p?: string | null, size: "w342" | "w185" = "w342") {
  return p ? `https://image.tmdb.org/t/p/${size}${p}` : "";
}
function profileUrl(p?: string | null, size: "w185" | "w92" = "w92") {
  return p ? `https://image.tmdb.org/t/p/${size}${p}` : "";
}
function yearOf(date?: string | null) {
  return date && date.length >= 4 ? date.slice(0, 4) : "";
}

async function fetchTv(id: string): Promise<{ tv: TvDetails | null; credits: Credits | null }> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return { tv: null, credits: null };
  try {
    const r = await fetch(
      `https://api.themoviedb.org/3/tv/${id}?api_key=${key}&language=en-US&append_to_response=credits`,
      { next: { revalidate } }
    );
    if (!r.ok) return { tv: null, credits: null };
    const data = await r.json();
    const tv: TvDetails = {
      id: data?.id,
      name: data?.name,
      overview: data?.overview ?? null,
      first_air_date: data?.first_air_date ?? null,
      poster_path: data?.poster_path ?? null,
      genres: Array.isArray(data?.genres) ? data.genres : [],
      number_of_seasons: data?.number_of_seasons ?? null,
      number_of_episodes: data?.number_of_episodes ?? null,
    };
    const credits: Credits = {
      cast: Array.isArray(data?.credits?.cast) ? data.credits.cast.slice(0, 12) : [],
    };
    return { tv, credits };
  } catch {
    return { tv: null, credits: null };
  }
}

export default async function TvDetailPage({ params }: { params: { id: string } }) {
  const { tv, credits } = await fetchTv(params.id);
  if (!tv) {
    return (
      <div className="card">
        <h1 className="text-xl font-semibold">TV Show not found</h1>
        <p className="text-gray-400 text-sm mt-2">Try another title.</p>
      </div>
    );
  }
  const yr = yearOf(tv.first_air_date);
  const genreLine = (tv.genres || []).map((g) => g.name).join(", ");
  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="card">
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <img
              src={posterUrl(tv.poster_path, "w342")}
              alt={`Poster for ${tv.name}${yr ? ` (${yr})` : ""}`}
              className="w-full h-auto rounded"
            />
          </div>
          <div className="md:col-span-2 space-y-3">
            <h1 className="text-2xl font-bold">
              {tv.name} {yr ? <span className="text-gray-400 font-normal">({yr})</span> : null}
            </h1>
            {genreLine && <div className="text-sm text-gray-300">{genreLine}</div>}
            <div className="text-sm text-gray-400">
              {tv.number_of_seasons != null && (
                <span className="mr-3">{tv.number_of_seasons} season{tv.number_of_seasons === 1 ? "" : "s"}</span>
              )}
              {tv.number_of_episodes != null && (
                <span>{tv.number_of_episodes} episode{tv.number_of_episodes === 1 ? "" : "s"}</span>
              )}
            </div>
            {tv.overview && <p className="text-gray-200 leading-relaxed">{tv.overview}</p>}
          </div>
        </div>
      </section>

      {/* Cast */}
      <section className="card">
        <h2 className="text-lg font-semibold mb-3">Cast</h2>
        {credits?.cast && credits.cast.length > 0 ? (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {credits.cast.map((c) => (
              <li key={c.id} className="bg-gray-800 rounded p-3">
                <div className="flex items-center gap-3">
                  <img
                    src={profileUrl(c.profile_path, "w92")}
                    alt={c.name}
                    className="w-12 h-12 rounded-full object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.name}</div>
                    {c.character ? (
                      <div className="text-xs text-gray-400 truncate">as {c.character}</div>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-400 text-sm">No cast information available.</div>
        )}
      </section>
    </div>
  );
}
