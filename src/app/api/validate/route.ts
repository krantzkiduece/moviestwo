import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const username = form.get("username")?.toString().trim().toLowerCase();

  if (!username) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Check if the name exists in Redis
  const allowed = await redis.sismember("cc:allowed_users", username);

  if (!allowed) {
    return new NextResponse("Name not found", { status: 401 });
  }

  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set("cc_user", username, { path: "/", httpOnly: false });
  return res;
}
