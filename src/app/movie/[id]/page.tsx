// src/app/movie/[id]/page.tsx
export const revalidate = 86400; // revalidate once per day

import LocalRating from "../../../components/LocalRating";
import WatchlistButton from "../../../components/WatchlistButton";
import TopFiveButton from "../../../components/TopFiveButton";

async function getMovie(id: string) {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("Missing TMDB_API_KEY");
  const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${key}&append_to_response=credits`;
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error("Movie fetch failed");
  return res.json();
}

export default async function MoviePage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getMovie(params.id);
  const title = data.title || "Untitled";
  const year = data.release_date ? ` (${data.release_date.slice(0, 4)})` : "";
  const overview = data.overview || "No description available.";
  const poster = data.poster_path
    ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
    : null;
  const cast =
    Array.isArray(data?.credits?.cast)
      ? data.credits.cast.slice(0, 10).map((c: any) => c.name).join(", ")
      : "";

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            {poster ? (
              <img
                src={poster}
                alt={`Poster for ${title}${year}`}
                className="w-full h-auto"
              />
            ) : (
              <div className="p-6 text-gray-400 text-sm">No poster available</div>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <h1 className="text-3xl font-bold">
            {title}{year}
          </h1>
          <p className="text-gray-300 mt-3">{overview}</p>

          <div className="mt-6 space-y-5">
            <div>
              <span className="text-gray-400 text-sm">Cast: </span>
              <span className="text-gray-200">{cast || "—"}</span>
            </div>

            {/* Watchlist button */}
            <div>
              <div className="text-sm text-gray-400">Watchlist</div>
              <div className="mt-2">
                <WatchlistButton movieId={Number(params.id)} title={title} />
              </div>
            </div>

            {/* Your Rating (saved in browser for now) */}
            <div>
              <div className="text-sm text-gray-400">Your Rating</div>
              <div className="mt-2 bg-gray-800 rounded p-3">
                <LocalRating movieId={Number(params.id)} title={title} />
              </div>
            </div>

            {/* Top 5 */}
            <div>
              <div className="text-sm text-gray-400">Top 5</div>
              <div className="mt-2">
                <TopFiveButton movieId={Number(params.id)} title={title} />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                (Max 5. You must set a rating before adding to Top 5.)
              </div>
            </div>

            {/* Comments placeholder for later */}
            <div>
              <div className="text-sm text-gray-400">Comments (coming soon)</div>
              <div className="mt-2 bg-gray-800 rounded p-3 text-gray-500">
                Nested thread will appear here.
              </div>
            </div>
          </div>
        </div>
      </div>

      <a href="/search" className="text-blue-400 hover:text-blue-300 text-sm">
        ← Back to Search
      </a>
    </div>
  );
}
