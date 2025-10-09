// src/app/api/session/logout/route.ts
import { NextRequest, NextResponse } from "next/server";

function clear(res: NextResponse) {
  // Clear cookie by setting it expired
  res.cookies.set("cc_user", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function POST(_req: NextRequest) {
  return clear(NextResponse.json({ ok: true }));
}

// Also allow GET so you can hit it from the browser directly while testing
export async function GET(_req: NextRequest) {
  return clear(NextResponse.json({ ok: true }));
}
