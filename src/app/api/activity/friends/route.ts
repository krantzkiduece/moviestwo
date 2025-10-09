// src/app/api/activity/friends/route.ts
// De-duplicated Friends' Trending feed (one entry per user+movie, newest-first)
// Aligns with simplified Redis helper (no generics) and the unified list key.

import { NextRequest, NextResponse } from "next/server";
import { redis } from "../../../../lib/redis";

const LIST_KEY = "activity:events";
// Only count these event types as "trending"
const ALLOWED = new Set<string>(["rated", "watchlist_added", "top5_added"]);

type ActivityEvent = {
  at: number;
  type: string;
  movieId: number;
  username?: string | null;
  title?: string | null;
  poster_path?: string | null;
  release_date?: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(200, Number(searchParams.get("limit") || "50")));

    // Read newest-first window
    const rawList = await redis.lrange(LIST_KEY, 0, 999);

    const seen = new Set<string>();
    const items: ActivityEvent[] = [];

    for (const raw of rawList) {
      let ev: ActivityEvent | null = null;
      try {
        ev = JSON.parse(raw);
      } catch {
        continue;
      }
      if (!ev) continue;
      if (!ALLOWED.has(ev.type)) continue;
      if (!ev.movieId || !ev.at) continue;

      const uname = (ev.username || "").toLowerCase();
      if (!uname) continue;

      const key = `${uname}:${ev.movieId}`;
      if (seen.has(key)) continue; // keep only newest for this user+movie
      seen.add(key);

      items.push({
        at: ev.at,
        type: ev.type,
        movieId: ev.movieId,
        username: uname,
        title: ev.title ?? null,
        poster_path: ev.poster_path ?? null,
        release_date: ev.release_date ?? null,
      });

      if (items.length >= limit) break;
    }

    return NextResponse.json({ items, total: items.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load friends feed" }, { status: 500 });
  }
}
