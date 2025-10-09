// src/components/PublishProfile.tsx
"use client";
import { useEffect, useMemo, useState } from "react";

type Friend = { username: string; displayName: string };
type WatchItem = { movieId: number; title?: string };

// ---- Helpers: read local data ----
function readTopFive(): number[] {
  try {
    const raw = localStorage.getItem("top5");
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    const ids = Array.isArray(arr) ? arr : [];
    const clean = ids
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n) && n > 0);
    return Array.from(new Set(clean)).slice(0, 5);
  } catch {
    return [];
  }
}

function readWatchlist(): number[] {
  try {
    const raw = localStorage.getItem("watchlist");
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    const items: WatchItem[] = Array.isArray(arr) ? arr : [];
    const ids = items
      .map((i) => Number((i as any).movieId))
      .filter((n) => Number.isFinite(n) && n > 0);
    return Array.from(new Set(ids));
  } catch {
    return [];
  }
}

function readRatings(): Record<string, number> {
  const out: Record<string, number> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || "";
      if (!key.startsWith("rating:")) continue;
      const idStr = key.split(":")[1];
      const movieId = Number(idStr);
      if (!movieId) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      let value = 0;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && "value" in parsed) {
          value = Number((parsed as any).value);
        } else {
          value = parseFloat(raw);
        }
      } catch {
        value = parseFloat(raw);
      }
      if (!isNaN(value) && value > 0) {
        const v = Math.min(5, Math.max(0.5, Math.round(value * 2) / 2));
        out[String(movieId)] = v;
      }
    }
  } catch {}
  return out;
}

function readIdentity(): { username?: string; displayName?: string } {
  try {
    const raw = localStorage.getItem("cinecircle_identity");
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object") return obj as any;
  } catch {}
  return {};
}

function saveIdentity(username: string, displayName: string) {
  try {
    localStorage.setItem(
      "cinecircle_identity",
      JSON.stringify({ username, displayName })
    );
  } catch {}
}

// ---- Component ----
export default function PublishProfile() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [identity, setIdentity] = useState<{ username?: string; displayName?: string }>(() => readIdentity());
  const identityLabel =
    identity.displayName
      ? `${identity.displayName} (@${identity.username || ""})`
      : identity.username
      ? `@${identity.username}`
      : "Anonymous";

  // Load friend list (public GET)
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await fetch("/api/admin/friends", { cache: "no-store" });
        const data = await r.json();
        if (!cancel) {
          const list: Friend[] = Array.isArray(data?.friends) ? data.friends : [];
          setFriends(list);
          if (list.length && !username) setUsername(list[0].username);
        }
      } catch {
        if (!cancel) setFriends([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []); // once

  // Take a snapshot of local data (for the little preview numbers)
  const snapshot = useMemo(() => {
    const top5 = readTopFive();
    const watchlist = readWatchlist();
    const ratings = readRatings();
    return { top5, watchlist, ratings, counts: {
      top5: top5.length,
      watchlist: watchlist.length,
      ratings: Object.keys(ratings).length,
    }};
  }, []); // compute once when mounted

  // Quick identity setter (without publishing)
  const useAsIdentity = () => {
    setMsg(null); setErr(null);
    if (!username) {
      setErr("Pick a Friend username first.");
      return;
    }
    const f = friends.find((x) => x.username === username);
    const displayName = f?.displayName || username;
    saveIdentity(username, displayName);
    setIdentity({ username, displayName });
    setMsg(`Identity set to ${displayName} (@${username}). Your comments will use this name.`);
  };

  const publish = async () => {
    setMsg(null);
    setErr(null);
    if (!username) {
      setErr("Pick a Friend username to publish under.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        top5: snapshot.top5,
        watchlist: snapshot.watchlist,
        ratings: snapshot.ratings,
      };
      const r = await fetch(`/api/profile/${encodeURIComponent(username)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(data?.error || "Publish failed");
      } else {
        // ✔ also set identity on successful publish
        const f = friends.find((x) => x.username === username);
        const displayName = f?.displayName || username;
        saveIdentity(username, displayName);
        setIdentity({ username, displayName });

        setMsg(`Published! View at /u/${username}. Your commenting identity is now ${displayName} (@${username}).`);
      }
    } catch (e: any) {
      setErr(e?.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h2 className="text-xl font-semibold">Publish your profile</h2>
      <p className="text-gray-400 text-sm mt-1">
        Save your Top 5, Watchlist, and Ratings to a public profile so Friends can view them.
      </p>

      {/* Current identity */}
      <div className="text-xs text-gray-400 mt-2">
        Current commenting identity: <span className="font-medium">{identityLabel}</span>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mt-4">
        <div className="sm:col-span-2">
          <label className="block text-sm text-gray-400 mb-1">Publish as (Friend username)</label>
          <select
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          >
            {friends.length === 0 ? (
              <option value="">No friends yet — ask Admin to add some</option>
            ) : (
              friends.map((f) => (
                <option key={f.username} value={f.username}>
                  {f.displayName} (@{f.username})
                </option>
              ))
            )}
          </select>
        </div>
        <div className="self-end grid grid-cols-1 gap-2">
          <button
            onClick={publish}
            disabled={saving || !username}
            className="w-full bg-green-600 hover:bg-green-500 px-4 py-2 rounded disabled:opacity-60"
          >
            {saving ? "Publishing…" : "Publish"}
          </button>
          <button
            onClick={useAsIdentity}
            disabled={!username}
            className="w-full bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded disabled:opacity-60"
          >
            Use as my identity
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-400 mt-3">
        Snapshot: {snapshot.counts.top5} in Top 5 • {snapshot.counts.watchlist} in Watchlist •{" "}
        {snapshot.counts.ratings} ratings
      </div>

      {msg && (
        <div className="mt-3 text-sm text-green-400">
          {msg} — <a className="underline" href={`/u/${username}`}>open</a>
        </div>
      )}
      {err && <div className="mt-3 text-sm text-red-400">{err}</div>}
    </div>
  );
}
