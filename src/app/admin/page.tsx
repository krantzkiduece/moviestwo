"use client";
import { useEffect, useState } from "react";

type Friend = { username: string; displayName: string };

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  // Friends state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [uname, setUname] = useState("");
  const [dname, setDname] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Login: we mark "ok" when the server accepts the password.
  // (Cookie is httpOnly, so we can't read it on the client.)
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus("error");
        setMessage(err?.error || "Login failed");
        return;
      }
      setStatus("ok");
      setMessage("Logged in as Admin.");
      await loadFriends(); // load once we’re logged in
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message || "Network error");
    }
  };

  // Load list (GET is public, but POST/DELETE will require the admin cookie set above)
  const loadFriends = async () => {
    try {
      const r = await fetch("/api/admin/friends", { cache: "no-store" });
      if (!r.ok) throw new Error("Failed to load friends");
      const data = await r.json();
      setFriends(Array.isArray(data?.friends) ? data.friends : []);
    } catch {
      setFriends([]);
    }
  };

  // Add or update a friend
  const addFriend = async () => {
    if (!uname.trim() || !dname.trim()) {
      setMessage("Please fill both Username and Display Name.");
      return;
    }
    if (!/^[a-z0-9_-]{2,20}$/.test(uname.trim())) {
      setMessage("Invalid username. Use 2–20 chars: a–z, 0–9, _ or -.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const r = await fetch("/api/admin/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: uname.trim(), displayName: dname.trim() }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMessage(data?.error || "Save failed");
      } else {
        setMessage("Saved.");
        setUname("");
        setDname("");
        await loadFriends();
      }
    } catch (e: any) {
      setMessage(e?.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  // Delete a friend
  const deleteFriend = async (username: string) => {
    setDeleting(username);
    setMessage("");
    try {
      const r = await fetch(`/api/admin/friends?username=${encodeURIComponent(username)}`, {
        method: "DELETE",
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMessage(data?.error || "Delete failed");
      } else {
        setMessage("Deleted.");
        await loadFriends();
      }
    } catch (e: any) {
      setMessage(e?.message || "Network error");
    } finally {
      setDeleting(null);
    }
  };

  if (status !== "ok") {
    return (
      <div className="card max-w-md">
        <h1 className="text-2xl font-bold">Admin Login</h1>
        <p className="text-gray-400 mt-2 text-sm">
          Enter the admin password you set in Vercel environment variables
          (<code>ADMIN_PASSWORD</code>).
        </p>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <input
            type="password"
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded disabled:opacity-60"
            disabled={status === "loading" || !password}
          >
            {status === "loading" ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {message && (
          <div className={`mt-3 text-sm ${status === "error" ? "text-red-400" : "text-green-400"}`}>
            {message}
          </div>
        )}
      </div>
    );
  }

  // Logged-in admin UI
  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-300 mt-2">
          You are logged in as <span className="font-semibold">Admin</span>.
        </p>
        <div className="mt-4 space-y-2 text-sm">
          <a className="text-blue-400 hover:text-blue-300" href="/trending">
            → View Trending (TMDb + Friends)
          </a>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold">Manage Friends</h2>
        <p className="text-gray-400 text-sm mb-4">
          Add usernames your group will use. Public list available at <code>/friends</code> (coming next).
        </p>

        <div className="grid sm:grid-cols-3 gap-3">
          <input
            className="bg-gray-900 border border-gray-700 rounded px-3 py-2"
            placeholder="username (e.g. kevin)"
            value={uname}
            onChange={(e) => setUname(e.target.value)}
          />
          <input
            className="bg-gray-900 border border-gray-700 rounded px-3 py-2"
            placeholder="Display name (e.g. Kevin)"
            value={dname}
            onChange={(e) => setDname(e.target.value)}
          />
          <button
            onClick={addFriend}
            disabled={saving}
            className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded disabled:opacity-60"
          >
            {saving ? "Saving…" : "Add / Update"}
          </button>
        </div>

        {message && <div className="mt-3 text-sm text-gray-300">{message}</div>}

        <div className="mt-6">
          <h3 className="font-semibold mb-2">Current Friends</h3>
          {friends.length === 0 ? (
            <div className="text-gray-400 text-sm">No friends yet.</div>
          ) : (
            <ul className="divide-y divide-gray-700">
              {friends.map((f) => (
                <li key={f.username} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{f.displayName}</div>
                    <div className="text-xs text-gray-400">@{f.username}</div>
                  </div>
                  <button
                    onClick={() => deleteFriend(f.username)}
                    disabled={deleting === f.username}
                    className="bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded text-sm disabled:opacity-60"
                  >
                    {deleting === f.username ? "Deleting…" : "Delete"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
