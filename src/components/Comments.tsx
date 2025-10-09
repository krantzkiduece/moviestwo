// src/components/Comments.tsx
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

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
  // newest-first from API; keep that ordering for roots
  const byId = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];
  for (const c of items) byId.set(c.id, { ...c, children: [] });
  for (const c of items) {
    const node = byId.get(c.id)!;
    if (c.parentId && byId.has(c.parentId)) {
      // newest first among replies
      byId.get(c.parentId)!.children.unshift(node);
    } else {
      roots.push(node);
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

/** Identity comes from your Friend profile (stored client-side).
 * We read localStorage key "cinecircle_identity" -> { username, displayName }.
 * If not set, we fall back to "Anonymous".
 */
function getIdentity(): { username?: string; displayName?: string } {
  try {
    const raw = localStorage.getItem("cinecircle_identity");
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object") return obj as any;
  } catch {}
  return {};
}

export default function Comments({ movieId, movieTitle }: { movieId: number; movieTitle?: string }) {
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState<RawComment[]>([]);
  const [error, setError] = useState<string | null>(null);

  // New root comment (no name field — we use identity)
  const [text, setText] = useState("");

  // Reply state — which comment is open, and its text
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // Focus fix: keep a stable ref to the reply textarea and refocus on open/re-render
  const replyRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (replyTo) {
      // Defer to next tick to allow DOM update
      const t = setTimeout(() => replyRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [replyTo, replyText]);

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

  const currentDisplayName = (() => {
    const id = getIdentity();
    return id.displayName || id.username || "Anonymous";
  })();

  const post = async () => {
    const body = { author: currentDisplayName, text: text.trim() };
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
      await load();
    } catch (e: any) {
      alert(e?.message || "Failed to post");
    }
  };

  const postReply = async () => {
    const parentId = replyTo;
    const body = { author: currentDisplayName, text: replyText.trim(), parentId };
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
      setReplyTo(null);
      await load();
    } catch (e: any) {
      alert(e?.message || "Failed to post reply");
    }
  };

  const CommentItem = React.memo(function CommentItem({
    node,
    depth = 0,
  }: {
    node: CommentNode;
    depth?: number;
  }) {
    return (
      <div className="mt-3">
        <div className="flex items-start gap-3">
          {depth > 0 && (
            <div className="w-4 flex justify-center">
              <div className="w-px bg-gray-700 h-full" />
            </div>
          )}
          <div className="flex-1">
            <div className="text-sm">
              <span className="font-semibold">{node.author || "Anonymous"}</span>{" "}
              <span className="text-gray-400">• {timeLabel(node.at)}</span>
            </div>
            <div className="whitespace-pre-wrap mt-1">{node.text}</div>
            <div className="mt-1">
              <button
                className="text-xs text-blue-400 hover:text-blue-300"
                onClick={() => {
                  setReplyTo(node.id);
                  setReplyText("");
                }}
                type="button"
              >
                Reply
              </button>
            </div>

            {/* reply box (no name field) */}
            {replyTo === node.id && (
              <div
                className="mt-2 p-3 bg-gray-900 border border-gray-800 rounded"
                onMouseDown={(e) => {
                  // help keep focus inside the editor on drag/select
                  e.stopPropagation();
                }}
              >
                <div className="text-xs text-gray-400 mb-1">
                  Replying as <span className="font-medium">{currentDisplayName}</span>
                </div>
                <textarea
                  ref={replyRef}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2"
                  placeholder="Write a reply…"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded text-sm"
                    onClick={postReply}
                    type="button"
                    disabled={!replyText.trim()}
                  >
                    Post reply
                  </button>
                  <button
                    className="text-sm text-gray-400 hover:text-gray-300"
                    onClick={() => setReplyTo(null)}
                    type="button"
                  >
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
  });

  return (
    <section className="card">
      <h2 className="text-xl font-semibold">
        Comments{movieTitle ? " — " + movieTitle : ""}
      </h2>

      {/* identity hint */}
      <div className="text-xs text-gray-400 mt-1">
        Commenting as <span className="font-medium">{currentDisplayName}</span>
        {currentDisplayName === "Anonymous" && (
          <>
            {" "}
            — set your Friend identity on{" "}
            <a className="text-blue-400 hover:text-blue-300" href="/profile/me">
              /profile/me
            </a>
            .
          </>
        )}
      </div>

      {/* new root comment (no name field) */}
      <div className="mt-4">
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
            type="button"
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
          <div className="text-gray-400 text-sm">
            No comments yet. Be the first to comment.
          </div>
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
