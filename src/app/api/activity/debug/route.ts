import { NextRequest, NextResponse } from "next/server";
import { redis } from "../../../../lib/redis";

const KEYS = ["activity:events", "activity"]; // new + legacy

function tryParse(s: string) {
  try {
    return { ok: true, value: JSON.parse(s) as any };
  } catch {
    return { ok: false, value: s };
  }
}

export async function GET(req: NextRequest) {
  const cookieUser = req.cookies.get("cc_user")?.value || null;

  const reports: any[] = [];
  for (const key of KEYS) {
    const len = await redis.llen(key);
    const raw = await redis.lrange(key, 0, Math.min(len - 1, 19)); // first 20 (newest)
    const items = raw.map((s, i) => {
      const p = tryParse(s);
      return {
        i,
        ok: p.ok,
        kind: typeof s,
        startsWith: typeof s === "string" ? s.slice(0, 30) : null,
        parsed: p.ok ? p.value : undefined,
        raw: p.ok ? undefined : String(s),
      };
    });
    reports.push({ key, len, sampleCount: items.length, items });
  }

  return NextResponse.json({ cookieUser, reports });
}
