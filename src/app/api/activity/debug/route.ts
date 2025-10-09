// src/app/api/activity/debug/route.ts
import { NextRequest, NextResponse } from "next/server";
import { redis } from "../../../../lib/redis";

const LIST_KEY = "activity:events";

export async function GET(req: NextRequest) {
  try {
    const cookieUser = req.cookies.get("cc_user")?.value || null;
    const raw = await redis.lrange<string>(LIST_KEY, 0, 50);
    const parsed = raw.map((s, i) => {
      try {
        return { i, ok: true, ...JSON.parse(s) };
      } catch {
        return { i, ok: false, raw: String(s) };
      }
    });
    return NextResponse.json({
      cookieUser,
      count: parsed.length,
      items: parsed,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "fail" }, { status: 500 });
  }
}
