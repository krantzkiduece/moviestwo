// src/app/api/session/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { redis } from "../../../../lib/redis";

// We store friends as:  key = friend:<username>, value = { username, displayName }
// (Matches your existing Admin friends API.)
const FRIEND_KEY = (u: string) => `friend:${u.toLowerCase()}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawUsername = String(body?.username || "").trim().toLowerCase();

    if (!rawUsername || !/^[a-z0-9_-]{2,20}$/.test(rawUsername)) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    }

    // Look up this friend in Redis
    const raw = await redis.get(FRIEND_KEY(rawUsername));
    if (!raw) {
      return NextResponse.json({ error: "Unknown username" }, { status: 404 });
    }

    const friend =
      typeof raw === "string" ? JSON.parse(raw) : (raw as { username: string; displayName: string });
    const displayName = friend?.displayName || rawUsername;

    // Set a simple session cookie with the username (HTTP-only)
    const res = NextResponse.json({ ok: true, username: rawUsername, displayName });
    res.cookies.set("cc_user", rawUsername, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Also return data so the client can set local identity for comments
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Login failed" }, { status: 500 });
  }
}
