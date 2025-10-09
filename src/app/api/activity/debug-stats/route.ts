// src/app/api/activity/debug-stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { redis } from "../../../../lib/redis";

const LIST_KEY = "activity:events";

export async function GET(_req: NextRequest) {
  try {
    const len = await redis.llen(LIST_KEY);
    const raw = await redis.lrange(LIST_KEY, 0, Math.min(20, len - 1));

    const items = raw.map((s, i) => {
      try {
        return { i, ok: true, ...JSON.parse(s) };
      } catch {
        return { i, ok: false, raw: String(s) };
      }
    });

    return NextResponse.json({
      listKey: LIST_KEY,
      len,
      sampleCount: items.length,
      items,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "redis error" },
      { status: 500 }
    );
  }
}
