// src/app/api/tmdb/tv/route.ts
// TV search via TMDb: GET /api/tmdb/tv?q=...
// Returns minimal fields with posters only.

import { NextRequest, NextResponse } from "next/server";

type TvResult = {
  id: number;
  name: string;
  first_air_date?: string;
  poster_path?: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const key = process.env.TMDB_API_KEY;
    if (!key) {
      return NextResponse.json({ results: [], error: "TMDB_API_KEY missing" }, { status: 500 });
    }
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    if (!q) return NextResponse.json({ results: [] });

    const url = `https://api.themoviedb.org/3/search/tv?api_key=${key}&language=en-US&include_adult=false&page=1&query=${encodeURIComponent(
      q
    )}`;

    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return NextResponse.json({ results: [] });

    const data = await r.json();
    const raw: TvResult[] = Array.isArray(data?.results) ? data.results : [];

    // Keep only entries with posters, normalize fields, and cap to 8
    const results = raw
      .filter((t) => !!t.poster_path && !!t.id && !!t.name)
      .slice(0, 8)
      .map((t) => ({
        id: t.id,
        title: t.name, // normalize to "title" for UI reuse
        release_date: t.first_air_date || null, // normalize to "release_date"
        poster_path: t.poster_path || null,
      }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
