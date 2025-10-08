import { NextRequest, NextResponse } from "next/server";

const TMDB_URL = "https://api.themoviedb.org/3";

export async function GET(_req: NextRequest, { params }: { params: { id: string }}) {
  try {
    const key = process.env.TMDB_API_KEY;
    if (!key) return NextResponse.json({ error: "Missing TMDB_API_KEY" }, { status: 500 });
    const url = `${TMDB_URL}/movie/${params.id}?api_key=${key}&append_to_response=credits`;
    const r = await fetch(url);
    const data = await r.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
