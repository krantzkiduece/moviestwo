// src/app/api/activity/debug-add/route.ts
import { NextRequest, NextResponse } from "next/server";
import { redis } from "../../../../lib/redis";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");
    const movieId = Number(idParam);
    if (!movieId) {
      return NextResponse.json({ error: "Pass ?id=TMDB_MOVIE_ID" }, { status: 400 });
    }

    const key = process.env.TMDB_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "Missing TMDB_API_KEY on server" }, { status: 500 });
    }

    // Fetch minimal TMDb info so the feed has a title/poster
    const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${key}&language=en-US`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json({ error: "TMDb fetch failed", details: text }, { status: r.status });
    }
    const data = await r.json();

    const event = {
      at: Date.now(),
      type: "rated" as const,
      movieId,
      title: data?.title ?? "",
      release_date: data?.release_date ?? "",
      poster_path: data?.poster_path ?? null,
    };

    // Push to Redis list and trim to last 200 items
    await redis.lpush("activity", JSON.stringify(event));
    await redis.ltrim("activity", 0, 199);

    return NextResponse.json({ ok: true, event });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
