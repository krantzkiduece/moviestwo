// src/app/movie/[id]/page.tsx
export const revalidate = 3600; // cache TMDb data for 1 hour (server-side)

import LocalRating from "../../../components/LocalRating";
import TopFiveButton from "../../../components/TopFiveButton";
import Comments from "../../../components/Comments";

type TMDbMovie = {
  id: number;
  title: string;
  overview?: string;
  poster_path?: string | null;
  release_date?: string;
  runtime?: number;
  genres?: { id: number; name: string }[];
};

type TMDbCredits = {
  cast?: { id: number; name: string; character?: string; profile_path?: string | null }[];
};

function posterUrl(p: string | null | undefined, size: "w342" | "w500" = "w342") {
  return p ? `https://image.tmdb.org/t/p/${size}${p}` : "https://via.placeholder.com/342x513?text=No+Poster";
}

function yearOf(date?: string) {
  return date && date.length >= 4 ? date.slice(0, 4) : "";
}

async function getMovie(id: string): Promise<TMDbMovie | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(
      `https://api.themoviedb.org/3/movie/${id}?api_key=${key}&language=en-US`,
      { next: { revalidate } }
    );
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function getCredits(id: string): Promise<TMDbCredits | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(
      `https://api.themoviedb.org/3/movie/${id}/credits?api_key=${key}&language=en-US`,
      { next: { revalidate } }
    );
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export default async function MoviePage({ params }: { params: { id: string } }) {
  const movie = await getMovie(params.id);
  const credits = await getCredits(params.id);

  if (!movie) {
    return (
      <div className="card">
        <h1 className="text-2xl font-bold">Movie not found</h1>
        <p className="text-gray-400 mt-2">
          We couldn’t load this title. Please try again later.
        </p>
      </div>
    );
  }

  const cast = (credits?.cast || []).slice(0, 10); // show top 10 cast
  const genres = (movie.genres || []).map((g) => g.name).join(", ");
  const relYear = yearOf(movie.release_date);

  return (
    <div className="space-y-8">
      {/* Header: Poster + Basic info */}
      <section className="card">
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <img
              src={posterUrl(movie.poster_path, "w342")}
              alt={`Poster for ${movie.title}${relYear ? ` (${relYear})` : ""}`}
              className="w-full h-auto rounded"
              loading="lazy"
            />
          </div>

          <div className="md:col-span-2 space-y-3">
            <h1 className="text-3xl font-bold">
              {movie.title} {relYear ? <span className="text-gray-400 font-normal">({relYear})</span> : null}
            </h1>

            {(genres || movie.runtime || movie.release_date) && (
              <div className="text-sm text-gray-300 space-y-1">
                {genres && genres.length > 0 && <div><span className="text-gray-400">Genres:</span> {genres}</div>}
                {movie.runtime ? (
                  <div><span className="text-gray-400">Runtime:</span> {movie.runtime} min</div>
                ) : null}
                {movie.release_date ? (
                  <div><span className="text-gray-400">Release:</span> {movie.release_date}</div>
                ) : null}
              </div>
            )}

            {movie.overview && (
              <p className="text-gray-200 leading-relaxed">{movie.overview}</p>
            )}

            {/* Cast */}
            {cast.length > 0 && (
              <div className="text-sm">
                <div className="font-semibold mb-1">Cast</div>
                <ul className="list-disc list-inside text-gray-300 space-y-0.5">
                  {cast.map((c) => (
                    <li key={c.id}>
                      <span className="font-medium">{c.name}</span>
                      {c.character ? <span className="text-gray-400"> as {c.character}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions: Rating + Top 5 */}
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-900 border border-gray-800 rounded">
