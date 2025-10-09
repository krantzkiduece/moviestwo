// src/app/admin/patch/page.tsx
"use client";

import { useState } from "react";

type ApiResult = {
  wrote?: Array<{ path: string; ok: boolean; error?: string }>;
  deleted?: Array<{ path: string; ok: boolean; error?: string }>;
  error?: string;
};

const TEMPLATE_REPLACE_ONE = `{
  "message": "Update a file",
  "files": [
    {
      "path": "src/app/layout.tsx",
      "content": "PASTE THE ENTIRE NEW FILE CONTENT HERE"
    }
  ]
}`;

const TEMPLATE_DELETE_ONE = `{
  "message": "Delete a file",
  "delete": [
    "src/path/to/remove.ts"
  ]
}`;

export default function AdminPatchPage() {
  const [mode, setMode] = useState<"raw" | "builder">("raw");
  const [raw, setRaw] = useState<string>(TEMPLATE_REPLACE_ONE);
  const [message, setMessage] = useState<string>("Update files");
  const [files, setFiles] = useState<Array<{ path: string; content: string }>>([
    { path: "src/app/example.ts", content: "// full file content here" },
  ]);
  const [deletes, setDeletes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string>("");

  function addFileRow() {
    setFiles((arr) => [...arr, { path: "", content: "" }]);
  }
  function updateFilePath(i: number, v: string) {
    setFiles((arr) => arr.map((f, idx) => (idx === i ? { ...f, path: v } : f)));
  }
  function updateFileContent(i: number, v: string) {
    setFiles((arr) => arr.map((f, idx) => (idx === i ? { ...f, content: v } : f)));
  }
  function removeFileRow(i: number) {
    setFiles((arr) => arr.filter((_, idx) => idx !== i));
  }
  function addDeleteRow() {
    setDeletes((arr) => [...arr, ""]);
  }
  function updateDelete(i: number, v: string) {
    setDeletes((arr) => arr.map((d, idx) => (idx === i ? v : d)));
  }
  function removeDeleteRow(i: number) {
    setDeletes((arr) => arr.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setOut("");

    try {
      let body: any;

      if (mode === "raw") {
        // Validate JSON first
        try {
          body = JSON.parse(raw);
        } catch (err: any) {
          setOut(`❌ Invalid JSON: ${err?.message || String(err)}`);
          setBusy(false);
          return;
        }
      } else {
        // Builder mode → construct JSON
        body = {
          message,
        } as any;
        const cleanFiles = files
          .map((f) => ({ path: f.path.trim(), content: f.content }))
          .filter((f) => f.path && typeof f.content === "string" && f.content.length > 0);
        const cleanDeletes = deletes.map((d) => d.trim()).filter(Boolean);

        if (cleanFiles.length > 0) body.files = cleanFiles;
        if (cleanDeletes.length > 0) body.delete = cleanDeletes;

        if (!body.files && !body.delete) {
          setOut("❌ Provide at least one file (with full content) or one delete path.");
          setBusy(false);
          return;
        }
      }

      const r = await fetch("/api/admin/patch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // We send the raw JSON string when in raw mode so very large file content is preserved exactly:
        body: mode === "raw" ? raw : JSON.stringify(body),
      });

      if (r.status === 401) {
        setOut("❌ Unauthorized. Visit /admin and log in as admin first.");
        setBusy(false);
        return;
      }

      const data = (await r.json()) as ApiResult;
      setOut(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setOut(`❌ Error: ${err?.message || String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  function useTemplateReplace() {
    setMode("raw");
    setRaw(TEMPLATE_REPLACE_ONE);
  }
  function useTemplateDelete() {
    setMode("raw");
    setRaw(TEMPLATE_DELETE_ONE);
  }

  return (
    <div className="space-y-6">
      <section className="card">
        <h1 className="text-xl font-semibold mb-2">Admin Patch (GitHub Commit)</h1>
        <p className="text-sm text-gray-400">
          Paste a <b>JSON patch</b> to commit full-file replacements to your GitHub repo. You must be
          logged in as <b>admin</b> (go to <code>/admin</code>) and you need <code>GITHUB_TOKEN</code>,{" "}
          <code>GITHUB_REPO</code>, <code>GITHUB_BRANCH</code> configured in Vercel.
        </p>
      </section>

      <section className="card">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => setMode("raw")}
            className={`px-3 py-1 rounded ${mode === "raw" ? "bg-blue-600" : "bg-gray-700"} `}
          >
            Raw JSON
          </button>
          <button
            type="button"
            onClick={() => setMode("builder")}
            className={`px-3 py-1 rounded ${mode === "builder" ? "bg-blue-600" : "bg-gray-700"} `}
          >
            Builder
          </button>
          <div className="flex-1" />
          <button type="button" onClick={useTemplateReplace} className="text-xs underline">
            Insert “Replace One File” template
          </button>
          <button type="button" onClick={useTemplateDelete} className="text-xs underline">
            Insert “Delete One File” template
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "raw" ? (
            <>
              <textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                className="w-full h-72 bg-gray-900 border border-gray-700 rounded p-3 font-mono text-sm"
                placeholder='{"message":"...", "files":[{"path":"...","content":"FULL FILE TEXT"}]}'
              />
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm mb-1">Commit message</label>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
                />
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold">Files</div>
                {files.map((f, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded p-3 space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={f.path}
                        onChange={(e) => updateFilePath(i, e.target.value)}
                        className="flex-1 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-sm"
                        placeholder="src/app/layout.tsx (full path)"
                      />
                      <button
                        type="button"
                        className="text-xs underline"
                        onClick={() => removeFileRow(i)}
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      value={f.content}
                      onChange={(e) => updateFileContent(i, e.target.value)}
                      className="w-full h-40 bg-gray-950 border border-gray-700 rounded p-2 font-mono text-xs"
                      placeholder="// paste the ENTIRE file content here"
                    />
                  </div>
                ))}
                <button type="button" onClick={addFileRow} className="text-xs underline">
                  + Add another file
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold">Delete paths (optional)</div>
                {deletes.map((d, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={d}
                      onChange={(e) => updateDelete(i, e.target.value)}
                      className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm"
                      placeholder="src/path/to/remove.ts"
                    />
                    <button
                      type="button"
                      className="text-xs underline"
                      onClick={() => removeDeleteRow(i)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addDeleteRow} className="text-xs underline">
                  + Add delete path
                </button>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={busy}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded px-4 py-2"
          >
            {busy ? "Committing…" : "Commit"}
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold mb-2">Result</h2>
        <pre className="bg-gray-900 border border-gray-800 rounded p-3 overflow-auto text-sm whitespace-pre-wrap">
{out || "—"}
        </pre>
        <p className="text-xs text-gray-500 mt-2">
          If you see <code>Unauthorized</code>, open <a className="underline" href="/admin">/admin</a> and log in
          as admin, then retry.
        </p>
      </section>
    </div>
  );
}
