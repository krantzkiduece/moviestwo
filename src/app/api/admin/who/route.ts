import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const who = cookies().get("cc_user")?.value ?? null;
  const admin = process.env.ADMIN_USER ?? "admin";
  return NextResponse.json({ cookie: who, admin });
}
