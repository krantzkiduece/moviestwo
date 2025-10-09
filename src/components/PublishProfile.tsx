// src/components/PublishProfile.tsx
// Replaced: this is now a simple identity selector with NO publish buttons.
// Your identity is used for comments and saved locally (no server write here).

"use client";
import { useEffect, useMemo, useState } from "react";

type Friend = { username: string; displayName: string };

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

export default function PublishProfile() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const identity = useMemo(() => readIdentity(), []);
  const identityLabel =
    identity.displayName
      ? `${identity.displayName} (@${identity.username || ""})`
      : identity.username
      ? `@${identity.username}`
      : "Anonymous";

  // Load friend list
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await fetch("/api/admin/friends", { cache: "no-store" });
        const data = await r.json();
        if (!cancel) {
          const list: Friend[] = Array.isArray(data?.friends) ? data.friends : [];
          setFriends(list);
          // Default to current identity if present; else first friend
          const current = identity.username;
          if (current && list.some((f) => f.username === current)) {
            setSelected(current);
          } else if (list.length) {
            setSelected(list[0].username);
          }
        }
      } catch {
        if (!cancel) setFriends([]);
      }
    })();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save identity when selection changes
  useEffect(() => {
    if (!selected) return;
    const f = friends.find((x) => x.username === selected);
    const displayName = f?.displayName || selected;
    saveIdentity(selected, displayName);
    setSavedAt(Date.now());
  }, [selected, friends]);

  return (
    <div className="card">
      <h2 className="text-xl font-semibold">My identity (for comments)</h2>
      <p className="text-gray-400 text-sm mt-1">
        Pick your Friend username. Changes save automatically and are used on comments.
      </p>

      <div className="grid sm:grid-cols-3 gap-3 mt-4">
        <div className="sm:col-span-2">
          <label className="block text-sm text-gray-400 mb-1">I am…</label>
          <select
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
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
          {savedAt && (
            <div className="text-xs text-green-400 mt-2">
              Identity saved{identityLabel !== "Anonymous" ? ` — commenting as ${readIdentity().displayName} (@${readIdentity().username})` : ""}.
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-400 mt-3">
        Current identity: <span className="font-medium">{identityLabel}</span>
      </div>
    </div>
  );
}
