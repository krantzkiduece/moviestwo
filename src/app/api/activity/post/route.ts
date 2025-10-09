// src/app/api/activity/post/route.ts
import { NextRequest, NextResponse } from "next/server";
import { redis } from "../../../../lib/redis";

const LIST_KEY = "activity:events";
const ALLOWED = new Set(["rated", "watchlist_added", "top5_added", "watchlist_removed", "top5_removed"]);

type Body = {
  type?: string;
  movieId?: number;
};

async function fetchMovie(movieId: number) {
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

export async function POST(req: NextRequest) {
  try {
    const { type, movieId }: Body = await req.json().catch(() => ({}));
    const t = String(type || "").trim();
    const id = Number(movieId);

    if (!ALLOWED.has(t) || !Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Read username from session cookie (set at /api/session/login)
    const username = (req.cookies.get("cc_user")?.value || "").toLowerCase();
    if (!username) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    // Enrich with TMDb metadata so Trending can render a clean card
    const meta = await fetchMovie(id);

    const event = {
      at: Date.now(),
      type: t,
      movieId: id,
      username,
      title: meta?.title || null,
      poster_path: meta?.poster_path || null,
      release_date: meta?.release_date || null,
    };

    // Push newest-first and keep the list bounded
    await redis.lpush(LIST_KEY, JSON.stringify(event));
    await redis.ltrim(LIST_KEY, 0, 1999); // keep last 2000 events

    return NextResponse.json({ ok: true, event });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to write activity" }, { status: 500 });
  }
}
