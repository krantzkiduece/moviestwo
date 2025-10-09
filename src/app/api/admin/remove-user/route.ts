import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name) return NextResponse.json({ ok: false });

  await redis.srem("cc:allowed_users", name.toLowerCase());
  return NextResponse.json({ ok: true });
}
