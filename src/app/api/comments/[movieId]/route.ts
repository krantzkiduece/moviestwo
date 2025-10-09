// src/app/api/comments/[movieId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { redis } from "../../../../lib/redis";

// Each comment we store in Redis as JSON:
// { id: string, movieId: number, parentId: string | null, author: string, text: string, at: number }
type Comment = {
  id: string;
  movieId: number;
  parentId: string | null;
  author: string;
  text: string;
  at: number;
};

const KEY = (movieId: number) => `comments:${movieId}`;       // list of JSON comments
const NEXT_ID_KEY = "comments:nextId";                        // global counter

// GET /api/comments/:movieId -> { comments: Comment[] } (most recent first)
export async function GET(
  _req: NextRequest,
  { params }: { params: { movieId: string } }
) {
  const idNum = Number(params.movieId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    return NextResponse.json({ error: "Invalid movieId" }, { status: 400 });
  }
  try {
    const raw = await redis.lrange(KEY(idNum), 0, -1);
    const comments: Comment[] = [];
    for (const item of raw as unknown[]) {
      try {
        const c = typeof item === "string" ? JSON.parse(item) : (item as any);
        if (c && c.id && typeof c.text === "string") comments.push(c as Comment);
      } catch {
        // skip bad rows
      }
    }
    // Most recent first; UI will handle nesting
    comments.sort((a, b) => (b.at || 0) - (a.at || 0));
    return NextResponse.json({ comments });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error loading comments" }, { status: 500 });
  }
}

// POST /api/comments/:movieId
// Body: { text: string, author?: string, parentId?: string }
export async function POST(
  req: NextRequest,
  { params }: { params: { movieId: string } }
) {
  const idNum = Number(params.movieId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    return NextResponse.json({ error: "Invalid movieId" }, { status: 400 });
  }
  try {
    const body = (await req.json()) as { text?: string; author?: string; parentId?: string | null };
    const text = (body.text || "").trim();
    const author = (body.author || "Anonymous").trim().slice(0, 40);
    const parentId = body.parentId ? String(body.parentId) : null;

    if (!text || text.length < 1) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json({ error: "Text is too long (max 2000 chars)" }, { status: 400 });
    }

    // Unique id via Redis counter
    const next = await redis.incr(NEXT_ID_KEY);
    const comment: Comment = {
      id: String(next),
      movieId: idNum,
      parentId,
      author: author || "Anonymous",
      text,
      at: Date.now(),
    };

    await redis.lpush(KEY(idNum), JSON.stringify(comment));
    return NextResponse.json({ ok: true, comment });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error saving comment" }, { status: 500 });
  }
}
