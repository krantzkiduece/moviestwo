// src/app/api/activity/recent/route.ts
import { NextRequest, NextResponse } from "next/server";
import { redis } from "../../../../lib/redis";

type Event = {
  at: number; // timestamp (ms)
  type: "rated" | "watchlist_added" | "top5_added" | "watchlist_removed" | "top5_removed";
  movieId: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = Number(searchParams.get("limit") || "50");
    const limit = Math.min(Math.max(limitParam, 1), 200); // 1..200

    // Most recent first
    const raw = (await redis.lrange("activity", 0, limit - 1)) as unknown[];

    const events: Event[] = [];
    for (const item of raw) {
      let e: any = item;
      // Upstash client may already return parsed objects. If it's a string, parse.
      if (typeof item === "string") {
        try {
          e = JSON.parse(item);
        } catch {
          continue; // skip malformed string
        }
      }
      if (e && typeof e.movieId === "number" && typeof e.at === "number") {
        events.push(e as Event);
      }
    }

    return NextResponse.json({ events });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
