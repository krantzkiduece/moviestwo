import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export async function GET() {
  try {
    // Will throw if UPSTASH_REDIS_REST_URL or _TOKEN are missing
    const r = Redis.fromEnv();
    const key = "cc:health:probe";
    const stamp = Date.now().toString();

    await r.set(key, stamp, { ex: 30 });
    const value = await r.get<string>(key);
    await r.del(key);

    return NextResponse.json({
      ok: true,
      wrote: stamp,
      read: value ?? null,
      url: process.env.UPSTASH_REDIS_REST_URL ? "present" : "missing",
      token: process.env.UPSTASH_REDIS_REST_TOKEN ? "present" : "missing",
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
