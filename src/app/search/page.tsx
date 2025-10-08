"use client";
import { useState } from "react";

type Movie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.results || []);
    } catch (err: any) {
      setError(err?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSearch} className="card flex gap-3 items-center">
        <input
          className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2"
          placeholder="Search by title, genre, cast, or year"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded">Search</button>
      </form>

      {loading && <p className="text-gray-300">Searching…</p>}
      {error && <p className="text-red-400">Error: {error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {results.map((m) => {
          const year = m.release_date ? ` (${m.release_date.slice(0,4)})` : "";
          const poster = m.poster_path
            ? `https://image.tmdb.org/t/p/w342${m.poster_path}`
            : "https://via.placeholder.com/342x513?text=No+Poster";
          return (
            <div key={m.id} className="card p-0 overflow-hidden">
              <img src={poster} alt={`Poster for ${m.title}${year}`} className="w-full h-auto" />
              <div className="p-3">
                <div className="font-semibold">{m.title}{year}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
