import { NextRequest, NextResponse } from "next/server";

const TMDB_URL = "https://api.themoviedb.org/3";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    if (!q) return NextResponse.json({ results: [] });

    const key = process.env.TMDB_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "Missing TMDB_API_KEY" }, { status: 500 });
    }

    // Simple heuristic: try multi-search for broader matching
    const url = `${TMDB_URL}/search/movie?query=${encodeURIComponent(q)}&api_key=${key}`;
    const r = await fetch(url);
    const data = await r.json();
    return NextResponse.json({ results: data.results || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
