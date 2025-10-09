import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode");
  const admin = process.env.ADMIN_USER ?? "admin";

  if (mode === "login") {
    const { user } = await req.json().catch(() => ({ user: "" }));
    const res = NextResponse.json({ ok: true, cookie: String(user || "") });
    // Not httpOnly so the simple UI can read it (okay for this admin-only flow)
    res.cookies.set("cc_user", String(user || ""), { path: "/", httpOnly: false });
    return res;
  }

  if (mode === "logout") {
    const res = NextResponse.json({ ok: true, cookie: null });
    res.cookies.set("cc_user", "", { path: "/", expires: new Date(0) });
    return res;
  }

  // Helpful message if someone calls this wrong
  return NextResponse.json(
    {
      ok: false,
      error: "invalid mode — use POST /api/admin/session?mode=login or mode=logout",
      expectedAdmin: admin,
    },
    { status: 400 }
  );
}
