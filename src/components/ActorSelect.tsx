"use client";
import { useEffect, useRef, useState } from "react";

type Person = {
  id: number;
  name: string;
  profile_path?: string | null;
  known_for_department?: string | null;
};

export default function ActorSelect({
  initialName = "",
  onSelect,
  placeholder = "Search an actor (e.g., Tom Cruise)",
}: {
  initialName?: string;
  onSelect: (p: { id: number; name: string }) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(initialName);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Person[]>([]);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const blurTimer = useRef<any>(null);

  // Fetch suggestions with a small debounce
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/tmdb/search-person?q=${encodeURIComponent(query.trim())}`, {
          cache: "no-store",
        });
        const data = await r.json();
        if (!cancelled) {
          setResults(Array.isArray(data?.results) ? data.results.slice(0, 10) : []);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      cancelled = true;
    };
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const pick = (p: Person) => {
    setQuery(p.name);
    setOpen(false);
    onSelect({ id: p.id, name: p.name });
  };

  const onBlur = () => {
    // Slight delay so clicks register before closing
    blurTimer.current = setTimeout(() => setOpen(false), 150);
  };
  const onFocus = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setOpen(true);
  };

  const profile = (path?: string | null) =>
    path
      ? `https://image.tmdb.org/t/p/w92${path}`
      : "https://via.placeholder.com/92x138?text=No+Photo";

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text"
        value={query}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
        aria-autocomplete="list"
        aria-expanded={open}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-lg max-h-80 overflow-auto">
          {loading && <div className="p-3 text-sm text-gray-400">Searching…</div>}
          {!loading && results.length === 0 && query.trim().length >= 2 && (
            <div className="p-3 text-sm text-gray-500">No matches</div>
          )}
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()} // keep focus until click processed
              onClick={() => pick(p)}
              className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-gray-800"
            >
              <img
                src={profile(p.profile_path)}
                alt={`${p.name} headshot`}
                className="w-10 h-10 rounded object-cover"
                loading="lazy"
              />
              <div className="min-w-0">
                <div className="font-medium truncate">{p.name}</div>
                {p.known_for_department && (
                  <div className="text-xs text-gray-400">{p.known_for_department}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
