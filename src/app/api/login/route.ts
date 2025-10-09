import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const username = form.get("username")?.toString() || "";

  if (!username) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set("cc_user", username, {
    path: "/",
    httpOnly: false,
  });

  return res;
}
