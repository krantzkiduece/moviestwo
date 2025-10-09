"use client";
import { useEffect, useState } from "react";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  // Helper: check if our admin cookie exists
  const isLoggedIn = () =>
    typeof document !== "undefined" &&
    document.cookie.split("; ").some((c) => c.startsWith("cinecircle_admin="));

  useEffect(() => {
    if (isLoggedIn()) setStatus("ok");
  }, []);

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
      // cookie set by server; reflect success in UI
      setStatus("ok");
      setMessage("Logged in as Admin.");
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message || "Network error");
    }
  };

  if (status === "ok") {
    return (
      <div className="card">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-300 mt-2">
          You are logged in as <span className="font-semibold">Admin</span>.
        </p>

        <div className="mt-6 space-y-3">
          <a className="text-blue-400 hover:text-blue-300" href="/trending">
            → View Trending (TMDb + Friends)
          </a>
          <div className="text-gray-400 text-sm">
            Friends management, username creation, and moderation tools coming soon.
          </div>
        </div>
      </div>
    );
  }

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
