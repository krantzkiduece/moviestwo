"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Movie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string;
};

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Typeahead state
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const debounceRef = useRef<number | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Debounced suggestions fetch
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      setSuggesting(false);
      setHighlightIndex(-1);
      return;
    }
    setSuggesting(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions((data.results || []).slice(0, 8));
      } catch {
        // ignore suggestion errors; user can still hit Search
      } finally {
        setSuggesting(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close suggestions on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) {
        setSuggestions([]);
        setHighlightIndex(-1);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (highlightIndex >= 0 && suggestions[highlightIndex]) {
      router.push(`/movie/${suggestions[highlightIndex].id}`);
      return;
    }
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

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      if (highlightIndex >= 0 && suggestions[highlightIndex]) {
        e.preventDefault();
        router.push(`/movie/${suggestions[highlightIndex].id}`);
      }
    } else if (e.key === "Escape") {
      setSuggestions([]);
      setHighlightIndex(-1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card" ref={boxRef}>
        <form onSubmit={onSearch} className="flex gap-3 items-center relative">
          <input
            className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2"
            placeholder="Search by title, genre, cast, or year"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            aria-autocomplete="list"
            aria-expanded={suggestions.length > 0}
            aria-controls="suggestions-listbox"
            aria-activedescendant={
              highlightIndex >= 0 ? `sugg-${suggestions[highlightIndex].id}` : undefined
            }
          />
          <button className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded">
            Search
          </button>

          {/* Suggestions dropdown */}
          {suggestions.length > 0 && (
            <ul
              id="suggestions-listbox"
              role="listbox"
              className="absolute left-0 right-0 top-full mt-2 bg-gray-900 border border-gray-700 rounded-lg z-10 max-h-96 overflow-auto"
            >
              {suggestions.map((m, idx) => {
                const year = m.release_date ? ` (${m.release_date.slice(0, 4)})` : "";
                const active = idx === highlightIndex;
                return (
                  <li
                    key={m.id}
                    id={`sugg-${m.id}`}
                    role="option"
                    aria-selected={active}
                    className={`px-3 py-2 cursor-pointer hover:bg-gray-800 ${
                      active ? "bg-gray-800" : ""
                    }`}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault(); // keep focus
                      router.push(`/movie/${m.id}`);
                    }}
                  >
                    {m.title}
                    {year}
                  </li>
                );
              })}
              {suggesting && (
                <li className="px-3 py-2 text-gray-400">Loading…</li>
              )}
            </ul>
          )}
        </form>
      </div>

      {loading && <p className="text-gray-300">Searching…</p>}
      {error && <p className="text-red-400">Error: {error}</p>}

      {/* Full results grid after pressing Search */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {results.map((m) => {
          const year = m.release_date ? ` (${m.release_date.slice(0, 4)})` : "";
          const poster = m.poster_path
            ? `https://image.tmdb.org/t/p/w342${m.poster_path}`
            : "https://via.placeholder.com/342x513?text=No+Poster";
          return (
            <Link
              key={m.id}
              href={`/movie/${m.id}`}
              className="card p-0 overflow-hidden hover:ring-2 hover:ring-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <img
                src={poster}
                alt={`Poster for ${m.title}${year}`}
                className="w-full h-auto"
              />
              <div className="p-3">
                <div className="font-semibold">
                  {m.title}
                  {year}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
