// src/app/api/activity/post/route.ts
import { NextRequest, NextResponse } from "next/server";
import { redis } from "../../../../lib/redis";

type Body = {
  type: "rated" | "watchlist_added" | "top5_added" | "watchlist_removed" | "top5_removed";
  movieId: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<Body>;
    const movieId = Number(body?.movieId);
    const type = body?.type;

    if (!movieId || !type) {
      return NextResponse.json({ error: "movieId and type are required" }, { status: 400 });
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

    // Build an activity event
    const event = {
      at: Date.now(),
      type,
      movieId,
      title: data?.title ?? "",
      release_date: data?.release_date ?? "",
      poster_path: data?.poster_path ?? null,
    };

    // Push to a Redis list and trim to the most recent 200 events
    await redis.lpush("activity", JSON.stringify(event));
    await redis.ltrim("activity", 0, 199);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
