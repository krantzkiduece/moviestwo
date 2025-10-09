"use client";
import { useMemo, useState } from "react";
import ActorSelect from "../../components/ActorSelect";

type MiniMovie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
};

const GENRES: { id: number; name: string }[] = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 35, name: "Comedy" },
  { id: 18, name: "Drama" },
  { id: 53, name: "Thriller" },
  { id: 878, name: "Sci-Fi" },
  { id: 27, name: "Horror" },
  { id: 10749, name: "Romance" },
  { id: 16, name: "Animation" },
  { id: 80, name: "Crime" },
];

function posterUrl(p: string | null | undefined, size: "w185" | "w342" = "w185") {
  return p ? `https://image.tmdb.org/t/p/${size}${p}` : "https://via.placeholder.com/185x278?text=No+Poster";
}

export default function OnboardingPage() {
  const thisYear = useMemo(() => new Date().getFullYear(), []);
  const [selected, setSelected] = useState<number[]>([]);
  const [fromYear, setFromYear] = useState(1990);
  const [toYear, setToYear] = useState(thisYear);

  // Actor selection via dropdown
  const [actorName, setActorName] = useState<string>("");
  const [actorPicked, setActorPicked] = useState<{ id: number; name: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MiniMovie[]>([]);
  const [error, setError] = useState<string | null>(null);

  const toggleGenre = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const clearActor = () => {
    setActorPicked(null);
    setActorName("");
  };

  const fetchSuggestions = async () => {
    setError(null);
    setLoading(true);
    setResults([]);
    try {
      const params = new URLSearchParams();
      if (selected.length) params.set("genres", selected.join(","));
      if (fromYear) params.set("fromYear", String(fromYear));
      if (toYear) params.set("toYear", String(toYear));
      // Our suggest API accepts actorName; we pass the picked name from the dropdown
      if (actorPicked?.name) params.set("actorName", actorPicked.name);

      const r = await fetch(`/api/tmdb/suggest?${params.toString()}`, { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Suggest failed");
      setResults(Array.isArray(data?.results) ? data.results : []);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="card">
        <h1 className="text-2xl font-bold">Get Started</h1>
        <p className="text-gray-400 text-sm mt-1">
          Answer a few quick questions and we&apos;ll suggest some movies. You can also{" "}
          <a className="text-blue-400 hover:text-blue-300" href="/search">skip</a> and search directly.
        </p>
      </section>

      <section className="card space-y-4">
        {/* Genres */}
        <div>
          <div className="font-semibold mb-2">Pick a few genres (optional)</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {GENRES.map((g) => (
              <label key={g.id} className={`px-3 py-2 rounded border cursor-pointer text-sm
                 ${selected.includes(g.id) ? "bg-blue-600 border-blue-600" : "bg-gray-900 border-gray-700 hover:border-gray-600"}`}>
                <input
                  type="checkbox"
                  className="mr-2 align-middle"
                  checked={selected.includes(g.id)}
                  onChange={() => toggleGenre(g.id)}
                />
                {g.name}
              </label>
            ))}
          </div>
        </div>

        {/* Years */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">From year</label>
            <input
              type="number"
              min={1900}
              max={toYear}
              value={fromYear}
              onChange={(e) => setFromYear(Number(e.target.value))}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">To year</label>
            <input
              type="number"
              min={fromYear}
              max={thisYear}
              value={toYear}
              onChange={(e) => setToYear(Number(e.target.value))}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
            />
          </div>
        </div>

        {/* Actor dropdown */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Favorite actor (optional)</label>
          <ActorSelect
            initialName={actorName}
            onSelect={(p) => {
              setActorPicked(p);
              setActorName(p.name);
            }}
            placeholder="Search an actor (e.g., Tom Cruise)"
          />
          {actorPicked && (
            <div className="flex items-center gap-3 mt-2 text-sm">
              <span className="text-gray-300">Selected: <span className="font-medium">{actorPicked.name}</span></span>
              <button onClick={clearActor} className="text-blue-400 hover:text-blue-300">
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSuggestions}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded disabled:opacity-60"
          >
            {loading ? "Finding movies…" : "See suggestions"}
          </button>
          <a href="/search" className="text-blue-400 hover:text-blue-300">Skip → Search</a>
        </div>
      </section>

      {/* Results */}
      <section className="card">
        <h2 className="text-xl font-semibold">Suggestions</h2>
        {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
        {!loading && results.length === 0 && !error && (
          <div className="text-gray-400 text-sm mt-2">No suggestions yet — pick options and click “See suggestions”.</div>
        )}
        {results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4 mt-4">
            {results.map((m) => {
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
    </div>
  );
}
