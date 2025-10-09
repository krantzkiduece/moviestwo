import { NextRequest, NextResponse } from "next/server";
import { redis } from "../../../../lib/redis";

// Read from both keys to support legacy writers.
const KEYS = ["activity:events", "activity"];
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

function isValid(ev: any): ev is ActivityEvent {
  return (
    ev &&
    typeof ev.at === "number" &&
    typeof ev.movieId === "number" &&
    typeof ev.type === "string"
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(200, Number(searchParams.get("limit") || "50")));

    const merged: ActivityEvent[] = [];

    for (const key of KEYS) {
      const raw = await redis.lrange(key, 0, 999);
      for (const s of raw) {
        let ev: any = null;
        try {
          ev = JSON.parse(s);
        } catch {
          // skip bad entries like "[object Object]"
          continue;
        }
        if (!isValid(ev)) continue;
        if (!ALLOWED.has(ev.type)) continue;

        const uname = (ev.username || "").toLowerCase();
        if (!uname) continue;

        merged.push({
          at: ev.at,
          type: ev.type,
          movieId: ev.movieId,
          username: uname,
          title: ev.title ?? null,
          poster_path: ev.poster_path ?? null,
          release_date: ev.release_date ?? null,
        });
      }
    }

    // Newest first across both keys
    merged.sort((a, b) => b.at - a.at);

    // Deduplicate per (user+movie), keeping newest
    const seen = new Set<string>();
    const items: ActivityEvent[] = [];
    for (const ev of merged) {
      const k = `${ev.username}:${ev.movieId}`;
      if (seen.has(k)) continue;
      seen.add(k);
      items.push(ev);
      if (items.length >= limit) break;
    }

    return NextResponse.json({ items, total: items.length });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load friends feed" },
      { status: 500 }
    );
  }
}
