"use client";
import { useEffect, useState } from "react";

type Friend = { username: string; displayName: string };

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/admin/friends", { cache: "no-store" });
        const data = await r.json();
        if (!cancelled) {
          setFriends(Array.isArray(data?.friends) ? data.friends : []);
        }
      } catch {
        if (!cancelled) setFriends([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <section className="card">
        <h1 className="text-2xl font-bold">Friends</h1>
        <p className="text-gray-400 text-sm mt-1">
          Public list of friends added by the Admin.
        </p>
      </section>

      <section className="card">
        {loading ? (
          <div className="text-gray-400">Loading…</div>
        ) : friends.length === 0 ? (
          <div className="text-gray-400">No friends yet.</div>
        ) : (
          <ul className="divide-y divide-gray-700">
            {friends.map((f) => (
              <li key={f.username} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{f.displayName}</div>
                  <div className="text-xs text-gray-400">@{f.username}</div>
                </div>
                <a
                  className="text-blue-400 hover:text-blue-300 text-sm"
                  href={`/u/${encodeURIComponent(f.username)}`}
                  title={`View ${f.displayName}'s profile`}
                >
                  View Profile
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
