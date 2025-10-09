// src/app/api/activity/force/route.ts
// Usage (GET):
// /api/activity/force?movieId=27205&type=rated
// Writes a single, well-formed JSON event to "activity:events" for the current user.

import { NextRequest, NextResponse } from "next/server";
import { redis } from "../../../../lib/redis";

const LIST_KEY = "activity:events";
const ALLOWED = new Set(["rated", "watchlist_added", "top5_added"]);

async function tmdbMovie(movieId: number) {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}?api_key=${key}&language=en-US`,
      { cache: "no-store" }
    );
    if (!r.ok) return null;
    const m = await r.json();
    return {
      title: m?.title || null,
      poster_path: m?.poster_path || null,
      release_date: m?.release_date || null,
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const type = (sp.get("type") || "").trim();
  const movieId = Number(sp.get("movieId") || "");
  if (!ALLOWED.has(type) || !Number.isFinite(movieId) || movieId <= 0) {
    return NextResponse.json({ ok: false, error: "Bad params" }, { status: 400 });
  }

  const username = (req.cookies.get("cc_user")?.value || "").toLowerCase() || "anon";
  const meta = await tmdbMovie(movieId);

  const event = {
    at: Date.now(),
    type,
    movieId,
    username,
    title: meta?.title || null,
    poster_path: meta?.poster_path || null,
    release_date: meta?.release_date || null,
  };

  // 🔒 always push a JSON string
  await redis.lpush(LIST_KEY, JSON.stringify(event));
  await redis.ltrim(LIST_KEY, 0, 1999);

  return NextResponse.json({ ok: true, event });
}
