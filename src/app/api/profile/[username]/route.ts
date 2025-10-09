// src/app/api/profile/[username]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { redis } from "../../../../lib/redis";

type Snapshot = {
  username: string;
  updatedAt: number;            // ms timestamp
  top5: number[];               // up to 5 TMDb IDs
  watchlist: number[];          // TMDb IDs
  ratings: Record<string, number>; // { [movieId]: 0.5..5.0 }
};

const DOC_KEY = (u: string) => `profile:${u.toLowerCase()}`;

function validUsername(u: string) {
  return /^[a-z0-9_-]{2,20}$/.test(u);
}

function sanitizeIds(arr: any, maxLen?: number): number[] {
  const ids = Array.isArray(arr) ? arr : [];
  const nums = ids
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n > 0);
  const uniq = Array.from(new Set(nums));
  return typeof maxLen === "number" ? uniq.slice(0, maxLen) : uniq;
}

function sanitizeRatings(obj: any): Record<string, number> {
  if (!obj || typeof obj !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj)) {
    const id = Number(k);
    const val = Number(v);
    if (Number.isFinite(id) && Number.isFinite(val) && val > 0 && val <= 5) {
      out[String(id)] = Math.round(val * 2) / 2; // force half-star steps
    }
  }
  return out;
}

// GET /api/profile/:username  -> returns a snapshot or {notFound:true}
export async function GET(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  const username = (params.username || "").toLowerCase();
  if (!validUsername(username)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }
  try {
    const raw = await redis.get(DOC_KEY(username));
    if (!raw) return NextResponse.json({ notFound: true });
    const doc = typeof raw === "string" ? JSON.parse(raw) : raw;
    return NextResponse.json(doc);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Read error" }, { status: 500 });
  }
}

// POST /api/profile/:username  -> upserts a snapshot
// Body: { top5:number[], watchlist:number[], ratings:{[id]:number} }
export async function POST(
  req: NextRequest,
  { params }: { params: { username: string } }
) {
  const username = (params.username || "").toLowerCase();
  if (!validUsername(username)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  try {
    const body = (await req.json()) as Partial<Snapshot>;

    const top5 = sanitizeIds(body.top5, 5);
    const watchlist = sanitizeIds(body.watchlist);
    const ratings = sanitizeRatings(body.ratings);

    const snapshot: Snapshot = {
      username,
      updatedAt: Date.now(),
      top5,
      watchlist,
      ratings,
    };

    await redis.set(DOC_KEY(username), JSON.stringify(snapshot));

    return NextResponse.json({ ok: true, snapshot });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Write error" }, { status: 500 });
  }
}
