// src/app/login/page.tsx
"use client";

import { useState } from "react";

type LoginResponse = {
  ok?: boolean;
  username?: string;
  displayName?: string;
  error?: string;
};

function saveIdentity(username: string, displayName: string) {
  try {
    localStorage.setItem(
      "cinecircle_identity",
      JSON.stringify({ username, displayName })
    );
  } catch {}
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = username.trim().toLowerCase();
    if (!u) return;
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/session/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u }),
      });
      const data: LoginResponse = await res.json().catch(() => ({} as any));
      if (!res.ok || !data.ok || !data.username) {
        setErr(data?.error || "Login failed");
        setSubmitting(false);
        return;
      }

      // Save local identity for comments UI
      saveIdentity(data.username, data.displayName || data.username);

      // Go to home
      window.location.href = "/";
    } catch (e: any) {
      setErr(e?.message || "Network error");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <section className="card">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="text-gray-400 text-sm mt-1">
          Enter the username provided by the Admin. No password needed.
        </p>

        <form onSubmit={doLogin} className="mt-5 space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Username</label>
            <input
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
              placeholder="e.g. phil"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </div>

          {err && <div className="text-sm text-red-400">{err}</div>}

          <button
            type="submit"
            disabled={submitting || !username.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>

          <div className="text-xs text-gray-500">
            Don’t have a username? Ask the Admin to create one.
          </div>
        </form>
      </section>
    </div>
  );
}
