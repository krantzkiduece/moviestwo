import { NextRequest, NextResponse } from "next/server";

// GET /api/tmdb/tv?q=the%20office
export async function GET(req: NextRequest) {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    return NextResponse.json(
      { results: [], error: "TMDB_API_KEY missing" },
      { status: 500 }
    );
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() || "";
  if (!q) return NextResponse.json({ results: [] });

  try {
    const url = `https://api.themoviedb.org/3/search/tv?api_key=${key}&language=en-US&include_adult=false&page=1&query=${encodeURIComponent(
      q
    )}`;

    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return NextResponse.json({ results: [] });

    const data = await r.json();
    const raw = Array.isArray(data?.results) ? data.results : [];

    // Normalize to match your movie result shape and keep posters only
    const results = raw
      .filter((t: any) => t && t.id && t.name && t.poster_path)
      .map((t: any) => ({
        id: t.id,
        title: t.name,                // keep a consistent "title" field for UI reuse
        release_date: t.first_air_date || null,
        poster_path: t.poster_path || null,
      }))
      .slice(0, 12);

    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json(
      { results: [], error: e?.message || "fetch failed" },
      { status: 500 }
    );
  }
}
