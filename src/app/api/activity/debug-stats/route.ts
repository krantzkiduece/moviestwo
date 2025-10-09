// src/app/api/activity/debug-stats/route.ts
import { NextResponse } from "next/server";
import { redis } from "../../../../lib/redis";

export async function GET() {
  try {
    const len = await redis.llen("activity"); // length of the list
    const sample = await redis.lrange<string>("activity", 0, 2); // a few newest items
    return NextResponse.json({ len, sample });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "redis error" }, { status: 500 });
  }
}
