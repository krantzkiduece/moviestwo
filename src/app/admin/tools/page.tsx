"use client";

import { useState } from "react";

export default function AdminTools() {
  const [path, setPath] = useState("src/app/.auth-test.txt");
  const [branch, setBranch] = useState("main");
  const [message, setMessage] = useState("chore(admin): update via /admin/tools");
  const [content, setContent] = useState("hello from cinecircle admin tools");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/admin/patch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content, message, branch }),
      });
      const j = await res.json();
      setResult(j);
    } catch (e: any) {
      setResult({ error: String(e?.message || e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="px-6 py-8 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-4">Admin Tools</h1>

      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-sm text-gray-700">Path (in repo)</span>
          <input className="border rounded px-3 py-2" value={path} onChange={e=>setPath(e.target.value)} />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-gray-700">Branch</span>
          <input className="border rounded px-3 py-2" value={branch} onChange={e=>setBranch(e.target.value)} />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-gray-700">Commit message</span>
          <input className="border rounded px-3 py-2" value={message} onChange={e=>setMessage(e.target.value)} />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-gray-700">Content</span>
          <textarea className="border rounded px-3 py-2 min-h-[120px]" value={content} onChange={e=>setContent(e.target.value)} />
        </label>

        <div className="flex gap-2">
          <button
            onClick={run}
            disabled={busy}
            className="px-4 py-2 rounded bg-black text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Writing…" : "Write to GitHub"}
          </button>
          <a className="underline self-center" href="/admin">Back to Admin</a>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-medium mb-2">Result</h2>
        <pre className="text-sm border rounded p-3 overflow-auto bg-gray-50">
{result ? JSON.stringify(result, null, 2) : "—"}
        </pre>
      </div>
    </main>
  );
}
