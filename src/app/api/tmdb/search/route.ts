// src/app/api/tmdb/search/route.ts
import { NextRequest, NextResponse } from "next/server";

const TMDB = "https://api.themoviedb.org/3";

type MiniMovie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
};

// Posters first → newer release → title A→Z
function posterFirstSort(a: MiniMovie, b: MiniMovie) {
  const ap = a.poster_path ? 0 : 1;
  const bp = b.poster_path ? 0 : 1;
  if (ap !== bp) return ap - bp;
  const ay = a.release_date || "";
  const by = b.release_date || "";
  if (ay !== by) return (by || "").localeCompare(ay || "");
  return (a.title || "").localeCompare(b.title || "");
}

export async function GET(req: NextRequest) {
  try {
    const key = process.env.TMDB_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "Missing TMDB_API_KEY on server" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.min(Math.max(Number(searchParams.get("page") || "1"), 1), 5);

    if (!q) return NextResponse.json({ results: [] });

    const url =
      `${TMDB}/search/movie?` +
      new URLSearchParams({
        api_key: key,
        language: "en-US",
        query: q,
        page: String(page),
        include_adult: "false",
      }).toString();

    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json({ error: "TMDb search failed", details: text }, { status: r.status });
    }

    const data = await r.json();
    const results: MiniMovie[] = Array.isArray(data?.results)
      ? data.results.map((m: any) => ({
          id: m.id,
          title: m.title,
          release_date: m.release_date,
          poster_path: m.poster_path ?? null,
        }))
      : [];

    // Posters first
    results.sort(posterFirstSort);

    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
