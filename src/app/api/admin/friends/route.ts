// src/app/api/admin/friends/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redis } from "../../../../lib/redis";

/**
 * Data model (very simple for now)
 * - Index: "friends:index"  (a Redis Set of usernames)
 * - Each friend doc: key "friend:<username>" -> JSON string:
 *   { username: string, displayName: string }
 */

type Friend = {
  username: string;     // slug (e.g., "kevin")
  displayName: string;  // e.g., "Kevin"
};

const INDEX_KEY = "friends:index";
const DOC_KEY = (u: string) => `friend:${u}`;

function isAdmin(): boolean {
  try {
    const c = cookies().get("cinecircle_admin")?.value;
    return c === "1";
  } catch {
    return false;
  }
}
function validUsername(u: string): boolean {
  // lowercase letters, numbers, dash/underscore; 2..20 chars
  return /^[a-z0-9_-]{2,20}$/.test(u);
}

// GET: public — list all friends (sorted by username)
export async function GET() {
  try {
    const usernames = await redis.smembers<string>(INDEX_KEY);
    const sorted = (usernames || []).sort();
    const items: Friend[] = [];

    for (const u of sorted) {
      try {
        const raw = await redis.get<string>(DOC_KEY(u));
        if (!raw) continue;
        const f = JSON.parse(raw) as Friend;
        if (f && f.username) items.push(f);
      } catch {
        // ignore malformed docs
      }
    }

    return NextResponse.json({ friends: items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error listing friends" }, { status: 500 });
  }
}

// POST: admin only — add or update a friend
export async function POST(req: NextRequest) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as Partial<Friend>;
    const username = (body.username || "").trim();
    const displayName = (body.displayName || "").trim();

    if (!username || !displayName) {
      return NextResponse.json({ error: "username and displayName are required" }, { status: 400 });
    }
    if (!validUsername(username)) {
      return NextResponse.json(
        { error: "Invalid username. Use 2–20 chars: a–z, 0–9, _ or -." },
        { status: 400 }
      );
    }

    const doc: Friend = { username, displayName };
    await redis.sadd(INDEX_KEY, username);
    await redis.set(DOC_KEY(username), JSON.stringify(doc));

    return NextResponse.json({ ok: true, friend: doc });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error saving friend" }, { status: 500 });
  }
}

// DELETE: admin only — remove a friend (?username=kevin)
export async function DELETE(req: NextRequest) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const username = (searchParams.get("username") || "").trim();

    if (!username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }

    await redis.srem(INDEX_KEY, username);
    await redis.del(DOC_KEY(username));

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error deleting friend" }, { status: 500 });
  }
}
