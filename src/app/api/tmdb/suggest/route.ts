// src/app/api/tmdb/suggest/route.ts
import { NextRequest, NextResponse } from "next/server";

const TMDB = "https://api.themoviedb.org/3";

type MiniMovie = {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  genre_ids?: number[]; // present on credits results
};

async function findActorId(name: string, key: string): Promise<number | null> {
  if (!name.trim()) return null;
  const url = `${TMDB}/search/person?api_key=${key}&language=en-US&query=${encodeURIComponent(
    name.trim()
  )}&page=1&include_adult=false`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return null;
  const data = await r.json();
  const id = data?.results?.[0]?.id;
  return typeof id === "number" ? id : null;
}

function inYearRange(dateStr: string | undefined, from?: number, to?: number) {
  if (!dateStr) return true;
  const y = Number(dateStr.slice(0, 4));
  if (!Number.isFinite(y)) return true;
  if (from && y < from) return false;
  if (to && y > to) return false;
  return true;
}

function matchesGenres(movie: MiniMovie, wanted: number[] | null) {
  if (!wanted || wanted.length === 0) return true;
  const g = movie.genre_ids || [];
  return g.some((id) => wanted.includes(id));
}

function posterFirstSort(a: MiniMovie, b: MiniMovie) {
  const ap = a.poster_path ? 0 : 1;
  const bp = b.poster_path ? 0 : 1;
  if (ap !== bp) return ap - bp; // posters first
  const ay = a.release_date || "";
  const by = b.release_date || "";
  if (ay !== by) return (by || "").localeCompare(ay || ""); // newer first
  return (a.title || "").localeCompare(b.title || "");
}

export async function GET(req: NextRequest) {
  try {
    const key = process.env.TMDB_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "Missing TMDB_API_KEY on server" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const genresParam = (searchParams.get("genres") || "").trim();
    const fromYear = Number(searchParams.get("fromYear") || "");
    const toYear = Number(searchParams.get("toYear") || "");
    const actorName = (searchParams.get("actorName") || "").trim();

    const wantedGenres = genresParam
      ? genresParam
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n))
      : null;

    // If an actor is chosen: return full filmography (filtered), posters first
    if (actorName) {
      const actorId = await findActorId(actorName, key);
      if (!actorId) return NextResponse.json({ results: [] });

      const url = `${TMDB}/person/${actorId}/movie_credits?api_key=${key}&language=en-US`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) {
        const text = await r.text();
        return NextResponse.json(
          { error: "TMDb movie_credits failed", details: text },
          { status: r.status }
        );
      }
      const data = await r.json();

      const list: MiniMovie[] = Array.isArray(data?.cast)
        ? data.cast.map((m: any) => ({
            id: m.id,
            title: m.title,
            release_date: m.release_date,
            poster_path: m.poster_path ?? null,
            genre_ids: Array.isArray(m.genre_ids) ? m.genre_ids : [],
          }))
        : [];

      const filtered = list.filter(
        (m) => inYearRange(m.release_date, fromYear, toYear) && matchesGenres(m, wantedGenres)
      );

      const results = filtered.sort(posterFirstSort);
      return NextResponse.json({ results });
    }

    // Otherwise (no actor): Discover results, posters first, then take top 12
    const params = new URLSearchParams({
      api_key: key,
      language: "en-US",
      include_adult: "false",
      include_video: "false",
      sort_by: "popularity.desc",
      "vote_count.gte": "50",
      page: "1",
    });
    if (genresParam) params.set("with_genres", genresParam);
    if (Number.isFinite(fromYear) && fromYear > 1900 && fromYear < 2100) {
      params.set("primary_release_date.gte", `${fromYear}-01-01`);
    }
    if (Number.isFinite(toYear) && toYear > 1900 && toYear < 2100) {
      params.set("primary_release_date.lte", `${toYear}-12-31`);
    }

    const url = `${TMDB}/discover/movie?${params.toString()}`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json(
        { error: "TMDb discover failed", details: text },
        { status: r.status }
      );
    }
    const data = await r.json();
    const list: MiniMovie[] = Array.isArray(data?.results)
      ? data.results.map((m: any) => ({
          id: m.id,
          title: m.title,
          release_date: m.release_date,
          poster_path: m.poster_path ?? null,
        }))
      : [];

    const sorted = list.sort(posterFirstSort);
    return NextResponse.json({ results: sorted.slice(0, 12) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
