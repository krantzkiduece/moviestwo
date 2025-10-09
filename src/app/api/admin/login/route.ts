// src/app/api/admin/login/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json().catch(() => ({} as any));
    const password = (data?.password || "").trim();

    const expected = process.env.ADMIN_PASSWORD || "";
    if (!expected) {
      return NextResponse.json(
        { error: "ADMIN_PASSWORD is not configured" },
        { status: 500 }
      );
    }

    if (!password || password !== expected) {
      // Clear any stale cookie on failed login
      const res = NextResponse.json({ ok: false, error: "Invalid password" }, { status: 401 });
      res.cookies.set("cc_admin", "0", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
        secure: true,
      });
      return res;
    }

    // Success → set admin cookie for the WHOLE SITE (important: path "/")
    const res = NextResponse.json({ ok: true });
    res.cookies.set("cc_admin", "1", {
      httpOnly: true,
      sameSite: "lax",   // send cookie on same-site POSTs (like /api/admin/patch)
      path: "/",         // make cookie visible to ALL routes
      maxAge: 60 * 60 * 8, // 8 hours
      secure: true,      // required on HTTPS (Vercel prod)
    });
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "login failed" },
      { status: 500 }
    );
  }
}
