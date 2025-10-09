// src/app/api/tmdb/people/route.ts
import { NextRequest, NextResponse } from "next/server";

const TMDB = "https://api.themoviedb.org/3";

type Person = {
  id: number;
  name: string;
  profile_path?: string | null;
  known_for_department?: string | null;
  popularity?: number;
};

// Images first → higher popularity → name A→Z
function profileFirstSort(a: Person, b: Person) {
  const ap = a.profile_path ? 0 : 1;
  const bp = b.profile_path ? 0 : 1;
  if (ap !== bp) return ap - bp;
  const apop = a.popularity ?? 0;
  const bpop = b.popularity ?? 0;
  if (apop !== bpop) return bpop - apop;
  return (a.name || "").localeCompare(b.name || "");
}

export async function GET(req: NextRequest) {
  try {
    const key = process.env.TMDB_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "Missing TMDB_API_KEY on server" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.min(Math.max(Number(searchParams.get("page") || "1"), 1), 5);

    if (!q) return NextResponse.json({ results: [] });

    const url =
      `${TMDB}/search/person?` +
      new URLSearchParams({
        api_key: key,
        language: "en-US",
        query: q,
        page: String(page),
        include_adult: "false",
      }).toString();

    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json({ error: "TMDb person search failed", details: text }, { status: r.status });
    }

    const data = await r.json();
    const results: Person[] = Array.isArray(data?.results)
      ? data.results.map((p: any) => ({
          id: p.id,
          name: p.name,
          profile_path: p.profile_path ?? null,
          known_for_department: p.known_for_department ?? null,
          popularity: p.popularity ?? 0,
        }))
      : [];

    results.sort(profileFirstSort);

    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
