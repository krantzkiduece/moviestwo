// src/app/api/tmdb/search-person/route.ts
import { NextRequest, NextResponse } from "next/server";

const TMDB = "https://api.themoviedb.org/3";

export async function GET(req: NextRequest) {
  try {
    const key = process.env.TMDB_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "Missing TMDB_API_KEY on server" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Number(searchParams.get("page") || "1");

    if (!q) {
      return NextResponse.json({ results: [] });
    }

    const url =
      `${TMDB}/search/person?` +
      new URLSearchParams({
        api_key: key,
        language: "en-US",
        query: q,
        page: String(Math.min(Math.max(page, 1), 5)),
        include_adult: "false",
      }).toString();

    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json({ error: "TMDb person search failed", details: text }, { status: r.status });
    }

    const data = await r.json();
    const results = Array.isArray(data?.results)
      ? data.results.map((p: any) => ({
          id: p.id,
          name: p.name,
          profile_path: p.profile_path ?? null,
          known_for_department: p.known_for_department ?? null,
        }))
      : [];

    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
