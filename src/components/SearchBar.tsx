// src/components/SearchBar.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MiniMovie = { id: number; title: string; release_date?: string; poster_path?: string | null };
type Person = { id: number; name: string; profile_path?: string | null; known_for_department?: string | null };

function posterUrl(p?: string | null, size: "w92" | "w154" = "w92") {
  return p ? `https://image.tmdb.org/t/p/${size}${p}` : "https://via.placeholder.com/92x138?text=No+Img";
}
function headshotUrl(p?: string | null, size: "w92" | "w154" = "w92") {
  return posterUrl(p, size);
}

function useDebouncedValue<T>(value: T, delay = 200) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function SearchBar() {
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q.trim(), 200);

  const [movieResults, setMovieResults] = useState<MiniMovie[]>([]);
  const [peopleResults, setPeopleResults] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ix, setIx] = useState<number>(-1); // keyboard highlight over flattened list

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Close when clicking outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Fetch movies + people when dq changes
  useEffect(() => {
    let abort = false;
    let ctrl1 = new AbortController();
    let ctrl2 = new AbortController();

    async function run() {
      if (!dq) {
        setMovieResults([]);
        setPeopleResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [mRes, pRes] = await Promise.all([
          fetch(`/api/tmdb/search?q=${encodeURIComponent(dq)}`, { cache: "no-store", signal: ctrl1.signal }),
          fetch(`/api/tmdb/people?q=${encodeURIComponent(dq)}`, { cache: "no-store", signal: ctrl2.signal }),
        ]);
        if (abort) return;
        const m = await mRes.json().catch(() => ({ results: [] }));
        const p = await pRes.json().catch(() => ({ results: [] }));
        setMovieResults(Array.isArray(m?.results) ? m.results.slice(0, 8) : []);
        setPeopleResults(Array.isArray(p?.results) ? p.results.slice(0, 6) : []);
      } catch {
        if (!abort) {
          setMovieResults([]);
          setPeopleResults([]);
        }
      } finally {
        if (!abort) setLoading(false);
      }
    }
    run();
    return () => {
      abort = true;
      ctrl1.abort();
      ctrl2.abort();
    };
  }, [dq]);

  // Flattened list for keyboard navigation (Actors first)
  const flat = useMemo(() => {
    const items: Array<
      | { kind: "label"; text: string }
      | { kind: "movie"; m: MiniMovie }
      | { kind: "person"; p: Person }
    > = [];
    if (peopleResults.length) {
      items.push({ kind: "label", text: "Actors" });
      for (const p of peopleResults) items.push({ kind: "person", p });
    }
    if (movieResults.length) {
      items.push({ kind: "label", text: "Movies" });
      for (const m of movieResults) items.push({ kind: "movie", m });
    }
    return items;
  }, [movieResults, peopleResults]);

  // Move highlight to first selectable item when results open
  useEffect(() => {
    if (!open || flat.length === 0) {
      setIx(-1);
      return;
    }
    // find first non-label
    const first = flat.findIndex((it) => it.kind !== "label");
    setIx(first);
  }, [open, flat]);

  const goMovie = (id: number) => {
    window.location.href = `/movie/${id}`;
  };
  const goActor = (id: number) => {
    window.location.href = `/suggestions?actorId=${id}`;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      let j = ix;
      do {
        j = Math.min(flat.length - 1, j + 1);
      } while (j < flat.length && flat[j]?.kind === "label");
      setIx(j);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      let j = ix;
      do {
        j = Math.max(0, j - 1);
      } while (j >= 0 && flat[j]?.kind === "label");
      setIx(j);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sel = flat[ix];
      if (!sel || sel.kind === "label") return;
      if (sel.kind === "movie") goMovie(sel.m.id);
      if (sel.kind === "person") goActor(sel.p.id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative w-full max-w-xl">
      <input
        ref={inputRef}
        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
        placeholder="Search actors or movies…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      {open && (dq || loading) && (
        <div className="absolute z-50 mt-1 w-full rounded border border-gray-700 bg-gray-900 shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-sm text-gray-400">Searching…</div>
          )}

          {!loading && flat.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">No results</div>
          )}

          {!loading && flat.length > 0 && (
            <ul className="max-h-96 overflow-auto py-1">
              {flat.map((item, i) => {
                if (item.kind === "label") {
                  return (
                    <li key={`label-${i}`} className="px-3 py-1 text-xs uppercase tracking-wide text-gray-400">
                      {item.text}
                    </li>
                  );
                }
                if (item.kind === "person") {
                  const p = item.p;
                  const active = i === ix;
                  return (
                    <li
                      key={`p-${p.id}`}
                      className={`px-3 py-2 flex items-center gap-3 cursor-pointer ${active ? "bg-gray-800" : "hover:bg-gray-800"}`}
                      onMouseEnter={() => setIx(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => goActor(p.id)}
                    >
                      <img
                        src={headshotUrl(p.profile_path, "w92")}
                        alt={`Headshot of ${p.name}`}
                        className="w-10 h-10 object-cover rounded"
                        loading="lazy"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        <div className="text-xs text-gray-400">{p.known_for_department || "Actor"}</div>
                      </div>
                    </li>
                  );
                }
                // movie
                const m = item.m;
                const year = m.release_date ? " (" + m.release_date.slice(0, 4) + ")" : "";
                const active = i === ix;
                return (
                  <li
                    key={`m-${m.id}`}
                    className={`px-3 py-2 flex items-center gap-3 cursor-pointer ${active ? "bg-gray-800" : "hover:bg-gray-800"}`}
                    onMouseEnter={() => setIx(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => goMovie(m.id)}
                  >
                    <img
                      src={posterUrl(m.poster_path, "w92")}
                      alt={`Poster for ${m.title}${year}`}
                      className="w-10 h-auto rounded"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{m.title}{year}</div>
                      <div className="text-xs text-gray-400">Movie</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
