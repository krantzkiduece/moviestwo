"use client";
import { useEffect, useMemo, useState } from "react";

/** Server shape (from our API)
 * { id: string, movieId: number, parentId: string|null, author: string, text: string, at: number }
 */
type RawComment = {
  id: string;
  movieId: number;
  parentId: string | null;
  author: string;
  text: string;
  at: number;
};

type CommentNode = RawComment & { children: CommentNode[] };

function buildTree(items: RawComment[]): CommentNode[] {
  // newest-first from API; we’ll keep that ordering for roots
  const byId = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];
  for (const c of items) byId.set(c.id, { ...c, children: [] });

  for (const c of items) {
    if (c.parentId && byId.has(c.parentId)) {
      byId.get(c.parentId)!.children.unshift(byId.get(c.id)!); // newest first among replies
    } else {
      roots.push(byId.get(c.id)!);
    }
  }
  return roots;
}

function timeLabel(ms: number) {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "";
  }
}

export default function Comments({ movieId, movieTitle }: { movieId: number; movieTitle?: string }) {
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState<RawComment[]>([]);
  const [error, setError] = useState<string | null>(null);

  // new root comment fields
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");

  // reply state: which comment id is “open” for reply
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyAuthor, setReplyAuthor] = useState("");
  const [replyText, setReplyText] = useState("");

  const tree = useMemo(() => buildTree(raw), [raw]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/comments/${movieId}`, { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Failed to load comments");
      setRaw(Array.isArray(data?.comments) ? data.comments : []);
    } catch (e: any) {
      setError(e?.message || "Network error");
      setRaw([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!movieId) return;
    load();
  }, [movieId]);

  const post = async () => {
    const body = { author: author.trim() || "Anonymous", text: text.trim() };
    if (!body.text) return;
    try {
      const r = await fetch(`/api/comments/${movieId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d?.error || "Failed to post comment");
      }
      setText("");
      setAuthor("");
      await load();
    } catch (e: any) {
      alert(e?.message || "Failed to post");
    }
  };

  const postReply = async () => {
    const parentId = replyTo;
    const body = { author: replyAuthor.trim() || "Anonymous", text: replyText.trim(), parentId };
    if (!body.text || !parentId) return;
    try {
      const r = await fetch(`/api/comments/${movieId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d?.error || "Failed to post reply");
      }
      setReplyText("");
      setReplyAuthor("");
      setReplyTo(null);
      await load();
    } catch (e: any) {
      alert(e?.message || "Failed to post reply");
    }
  };

  const CommentItem = ({ node, depth = 0 }: { node: CommentNode; depth?: number }) => {
    return (
      <div className="mt-3">
        <div className="flex items-start gap-3">
          {/* thread line */}
          {depth > 0 && <div className="w-4 flex justify-center"><div className="w-px bg-gray-700 h-full"></div></div>}
          <div className="flex-1">
            <div className="text-sm">
              <span className="font-semibold">{node.author || "Anonymous"}</span>{" "}
              <span className="text-gray-400">• {timeLabel(node.at)}</span>
            </div>
            <div className="whitespace-pre-wrap mt-1">{node.text}</div>
            <div className="mt-1">
              <button
                className="text-xs text-blue-400 hover:text-blue-300"
                onClick={() => setReplyTo(node.id)}
              >
                Reply
              </button>
            </div>

            {/* reply box */}
            {replyTo === node.id && (
              <div className="mt-2 p-3 bg-gray-900 border border-gray-800 rounded">
                <input
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 mb-2"
                  placeholder="Your name (optional)"
                  value={replyAuthor}
                  onChange={(e) => setReplyAuthor(e.target.value)}
                />
                <textarea
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2"
                  placeholder="Write a reply…"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                />
                <div className="mt-2 flex items-center gap-2">
                  <button className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded text-sm" onClick={postReply}>
                    Post reply
                  </button>
                  <button className="text-sm text-gray-400 hover:text-gray-300" onClick={() => setReplyTo(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* children */}
            {node.children.length > 0 && (
              <div className="pl-4 border-l border-gray-800 mt-3">
                {node.children.map((child) => (
                  <CommentItem key={child.id} node={child} depth={depth + 1} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="card">
      <h2 className="text-xl font-semibold">Comments{movieTitle ? ` — ${movieTitle}` : ""}</h2>

      {/* new root comment */}
      <div className="mt-4">
        <input
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 mb-2"
          placeholder="Your name (optional)"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
        <textarea
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
          placeholder="Write a comment…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
        />
        <div className="mt-2">
          <button
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded disabled:opacity-60"
            onClick={post}
            disabled={!text.trim()}
          >
            Post comment
          </button>
        </div>
      </div>

      {/* list */}
      <div className="mt-6">
        {loading ? (
          <div className="text-gray-400">Loading comments…</div>
        ) : error ? (
          <div className="text-red-400 text-sm">{error}</div>
        ) : raw.length === 0 ? (
          <div className="text-gray-400 text-sm">No comments yet. Be the first to comment.</div>
        ) : (
          <div className="space-y-2">
            {tree.map((n) => (
              <CommentItem key={n.id} node={n} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
