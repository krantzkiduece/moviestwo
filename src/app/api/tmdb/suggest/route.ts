// src/app/api/tmdb/suggest/route.ts
import { NextRequest, NextResponse } from "next/server";

const TMDB = "https://api.themoviedb.org/3";

type MiniMovie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
};

async function findActorId(name: string, key: string): Promise<number | null> {
  if (!name.trim()) return null;
  const url = `${TMDB}/search/person?api_key=${key}&language=en-US&query=${encodeURIComponent(
    name.trim()
  )}&page=1&include_adult=false`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return null;
  const data = await r.json();
  const id = data?.results?.[0]?.id;
  return typeof id === "number" ? id : null;
}

export async function GET(req: NextRequest) {
  try {
    const key = process.env.TMDB_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "Missing TMDB_API_KEY on server" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    // genres: comma-separated TMDb genre IDs, e.g. "28,12"
    const genresParam = (searchParams.get("genres") || "").trim();
    const fromYear = Number(searchParams.get("fromYear") || "");
    const toYear = Number(searchParams.get("toYear") || "");
    const actorName = (searchParams.get("actorName") || "").trim();

    let withCast: number | null = null;
    if (actorName) {
      withCast = await findActorId(actorName, key);
    }

    // Build Discover params
    const params = new URLSearchParams({
      api_key: key,
      language: "en-US",
      include_adult: "false",
      include_video: "false",
      sort_by: "popularity.desc",
      "vote_count.gte": "50", // avoid super-obscure
      page: "1",
    });

    if (genresParam) params.set("with_genres", genresParam);
    if (withCast) params.set("with_cast", String(withCast));
    if (Number.isFinite(fromYear) && fromYear > 1900 && fromYear < 2100) {
      params.set("primary_release_date.gte", `${fromYear}-01-01`);
    }
    if (Number.isFinite(toYear) && toYear > 1900 && toYear < 2100) {
      params.set("primary_release_date.lte", `${toYear}-12-31`);
    }

    const url = `${TMDB}/discover/movie?${params.toString()}`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json(
        { error: "TMDb discover failed", details: text },
        { status: r.status }
      );
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

    return NextResponse.json({ results: results.slice(0, 12) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
