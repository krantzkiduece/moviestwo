// src/app/api/activity/friends/route.ts
import { NextRequest, NextResponse } from "next/server";
import { redis } from "../../../../lib/redis";

// Events are appended via /api/activity/post (LPUSH newest-first) into this list key
const LIST_KEY = "activity:events";

// Only these event types count as "trending"
const ALLOWED = new Set<("rated" | "watchlist_added" | "top5_added")>([
  "rated",
  "watchlist_added",
  "top5_added",
]);

type ActivityEvent = {
  at: number; // timestamp (ms)
  type: "rated" | "watchlist_added" | "watchlist_removed" | "top5_added" | "top5_removed";
  movieId: number;
  username?: string; // filled from session in /api/activity/post
  title?: string;
  poster_path?: string | null;
  release_date?: string | null;
};

export async function GET(req: NextRequest) {
  try {
    // Optional: ?limit=50 (default)
    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(200, Number(searchParams.get("limit") || "50")));

    // Fetch a window of newest events (head of list). Adjust window if needed.
    const rawList = await redis.lrange<string>(LIST_KEY, 0, 999);

    // Deduplicate per (username + movieId) keeping the newest one
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
      if (!ALLOWED.has(ev.type as any)) continue;           // skip removals and non-trending
      if (!ev.movieId || !ev.at) continue;

      const uname = (ev.username || "").toLowerCase();
      if (!uname) continue; // require a known user for "Friends' trending"

      const key = `${uname}:${ev.movieId}`;
      if (seen.has(key)) continue;                           // already kept a newer one
      seen.add(key);

      items.push({
        at: ev.at,
        type: ev.type as any,
        movieId: ev.movieId,
        username: uname,
        title: ev.title,
        poster_path: ev.poster_path ?? null,
        release_date: ev.release_date ?? null,
      });

      if (items.length >= limit) break;
    }

    // items are already newest-first because list is newest-first
    return NextResponse.json({ items, total: items.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load activity" }, { status: 500 });
  }
}
