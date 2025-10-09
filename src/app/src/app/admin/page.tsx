"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [who, setWho] = useState<string | null>(null);
  const [typed, setTyped] = useState("");

  async function refreshWho() {
    const res = await fetch("/api/admin/who");
    const j = await res.json();
    setWho(j.cookie ?? null);
  }

  useEffect(() => {
    refreshWho();
  }, []);

  async function login() {
    await fetch("/api/admin/session?mode=login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: typed }),
    });
    setTyped("");
    refreshWho();
  }

  async function logout() {
    await fetch("/api/admin/session?mode=logout", { method: "POST" });
    refreshWho();
  }

  return (
    <main className="px-6 py-8 max-w-xl">
      <h1 className="text-2xl font-semibold mb-2">Admin</h1>
      <p className="text-sm text-gray-600 mb-6">
        You’re considered “logged in” when the{" "}
        <code className="px-1 bg-gray-100 rounded">cc_user</code> cookie equals
        your admin name (we’re using{" "}
        <code className="px-1 bg-gray-100 rounded">admin</code>).
      </p>

      <div className="mb-4">
        <div className="text-sm mb-2">
          Current session user:{" "}
          <span className="font-medium">{who ? who : "— (not set)"}</span>
        </div>
        <div className="flex gap-2">
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type: admin"
            className="border rounded px-3 py-2 w-64"
          />
          <button
            onClick={login}
            className="px-4 py-2 rounded bg-black text-white hover:opacity-90"
          >
            Log in
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 rounded border hover:bg-gray-50"
          >
            Log out
          </button>
        </div>
      </div>

      <a href="/admin/tools" className="inline-block mt-4 underline">
        Go to Admin Tools →
      </a>
    </main>
  );
}
