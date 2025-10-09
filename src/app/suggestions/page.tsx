// src/app/suggestions/page.tsx
// Shows filmography when ?actorId=<TMDb person id> is present.
export const revalidate = 86400; // cache server-side for 24h

type Person = {
  id: number;
  name: string;
  profile_path?: string | null;
  known_for_department?: string | null;
};
type MiniMovie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  character?: string | null;
};

function imgUrl(path?: string | null, size: "w185" | "w342" | "w92" = "w185") {
  return path
    ? `https://image.tmdb.org/t/p/${size}${path}`
    : size === "w92"
    ? "https://via.placeholder.com/92x138?text=No+Img"
    : "https://via.placeholder.com/185x278?text=No+Poster";
}

function postersFirstThenNewest(a: MiniMovie, b: MiniMovie) {
  const ap = a.poster_path ? 0 : 1;
  const bp = b.poster_path ? 0 : 1;
  if (ap !== bp) return ap - bp;
  const ay = a.release_date || "";
  const by = b.release_date || "";
  if (ay !== by) return (by || "").localeCompare(ay || "");
  return (a.title || "").localeCompare(b.title || "");
}

async function fetchPerson(personId: string): Promise<Person | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(
      `https://api.themoviedb.org/3/person/${personId}?api_key=${key}&language=en-US`,
      { next: { revalidate } }
    );
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function fetchFilmography(personId: string): Promise<MiniMovie[]> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return [];
  try {
    const r = await fetch(
      `https://api.themoviedb.org/3/person/${personId}/combined_credits?api_key=${key}&language=en-US`,
      { next: { revalidate } }
    );
    if (!r.ok) return [];
    const data = await r.json();
    const cast = Array.isArray(data?.cast) ? data.cast : [];
    const crew = Array.isArray(data?.crew) ? data.crew : [];

    // Prefer acting roles, but include crew movies too; dedupe by movie id
    const movies: Record<number, MiniMovie> = {};

    for (const c of cast) {
      if ((c.media_type || "movie") !== "movie") continue;
      if (!c.id || !c.title) continue;
      movies[c.id] = {
        id: c.id,
        title: c.title,
        release_date: c.release_date,
        poster_path: c.poster_path ?? null,
        character: c.character ?? null,
      };
    }
    for (const c of crew) {
      if ((c.media_type || "movie") !== "movie") continue;
      if (!c.id || !c.title) continue;
      if (!movies[c.id]) {
        movies[c.id] = {
          id: c.id,
          title: c.title,
          release_date: c.release_date,
          poster_path: c.poster_path ?? null,
          character: null,
        };
      }
    }

    const list = Object.values(movies);
    list.sort(postersFirstThenNewest);
    return list;
  } catch {
    return [];
  }
}

export default async function SuggestionsPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const actorId = String(searchParams?.actorId || "");
  const hasActor = actorId && /^\d+$/.test(actorId);

  if (!hasActor) {
    return (
      <div className="card">
        <h1 className="text-2xl font-bold">Suggestions</h1>
        <p className="text-gray-400 mt-2">
          Use the search bar to find an actor. Selecting an actor will bring you here
          with their filmography (e.g. <code>?actorId=500</code>).
        </p>
      </div>
    );
  }

  const [person, films] = await Promise.all([fetchPerson(actorId), fetchFilmography(actorId)]);

  if (!person) {
    return (
      <div className="card">
        <h1 className="text-2xl font-bold">Actor not found</h1>
        <p className="text-gray-400 mt-2">
          We couldn’t load details for this person (id {actorId}).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="card">
        <div className="flex items-start gap-4">
          <img
            src={imgUrl(person.profile_path, "w92")}
            alt={`Headshot of ${person.name}`}
            className="w-20 h-20 object-cover rounded"
          />
          <div>
            <h1 className="text-2xl font-bold">{person.name}</h1>
            <div className="text-sm text-gray-400">
              {person.known_for_department || "Actor"} • Filmography
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        {films.length === 0 ? (
          <div className="text-gray-400 text-sm">No movies found.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {films.map((m) => {
              const year = m.release_date ? ` (${m.release_date.slice(0, 4)})` : "";
              const role = m.character ? ` — as ${m.character}` : "";
              return (
                <a
                  key={m.id}
                  href={`/movie/${m.id}`}
                  className="bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500"
                >
                  <img
                    src={imgUrl(m.poster_path, "w185")}
                    alt={`Poster for ${m.title}${year}`}
                    className="w-full h-auto"
                    loading="lazy"
                  />
                  <div className="p-2 text-sm">
                    <div className="font-medium truncate">{m.title}{year}</div>
                    {role && <div className="text-xs text-gray-400 truncate">{role}</div>}
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
