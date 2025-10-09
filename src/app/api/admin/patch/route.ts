// src/app/api/admin/patch/route.ts
// A minimal GitHub committer endpoint for admins.
// It accepts a JSON "patch" (commit message + files to write/delete) and
// commits them to your repo/branch using your GITHUB_TOKEN.
//
// Security: requires the admin cookie (cc_admin=1). Do not expose publicly.

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

type PatchFile = { path: string; content: string };
type PatchBody = {
  message: string;
  files?: PatchFile[];
  delete?: string[];
};

function json(data: any, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

function b64(s: string) {
  return Buffer.from(s, "utf8").toString("base64");
}

async function getFileSha(owner: string, repo: string, branch: string, path: string, token: string) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(
    branch
  )}`;
  const r = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
    },
    cache: "no-store",
  });
  if (r.status === 404) return null;
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`GET contents failed for ${path}: ${r.status} ${t}`);
  }
  const j = (await r.json()) as any;
  return j?.sha || null;
}

async function putFile(
  owner: string,
  repo: string,
  branch: string,
  token: string,
  path: string,
  content: string,
  message: string,
  sha?: string | null
) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const body: any = {
    message,
    content: b64(content),
    branch,
    committer: { name: "CineCircle Bot", email: "bot@cinecircle.local" },
  };
  if (sha) body.sha = sha;

  const r = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`PUT ${path} failed: ${r.status} ${t}`);
  }
  return r.json();
}

async function deleteFile(
  owner: string,
  repo: string,
  branch: string,
  token: string,
  path: string,
  message: string
) {
  const sha = await getFileSha(owner, repo, branch, path, token);
  if (!sha) {
    // nothing to delete
    return { skipped: true, reason: "not found" };
  }
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const body: any = {
    message,
    sha,
    branch,
    committer: { name: "CineCircle Bot", email: "bot@cinecircle.local" },
  };

  const r = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`DELETE ${path} failed: ${r.status} ${t}`);
  }
  return r.json();
}

export async function POST(req: NextRequest) {
  // Require admin session (cookie cc_admin=1). This matches your existing admin login.
  const isAdmin = req.cookies.get("cc_admin")?.value === "1";
  if (!isAdmin) return json({ error: "Unauthorized" }, 401);

  const token = process.env.GITHUB_TOKEN || "";
  const repoFull = process.env.GITHUB_REPO || "";
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !repoFull.includes("/")) {
    return json(
      {
        error:
          "GitHub not configured. Please set GITHUB_TOKEN, GITHUB_REPO (e.g. owner/repo), and GITHUB_BRANCH in Vercel.",
      },
      500
    );
  }

  const [owner, repo] = repoFull.split("/", 2);

  let body: PatchBody | null = null;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body?.message || (!body.files || body.files.length === 0) && (!body.delete || body.delete.length === 0)) {
    return json({ error: "Provide a commit 'message' and at least one file or delete path." }, 400);
  }

  const results: any = { wrote: [] as any[], deleted: [] as any[] };

  // Write/Update files
  for (const f of body.files || []) {
    const path = (f?.path || "").trim();
    const content = typeof f?.content === "string" ? f.content : "";
    if (!path || !content) {
      results.wrote.push({ path, ok: false, error: "missing path or content" });
      continue;
    }
    try {
      const sha = await getFileSha(owner, repo, branch, path, token);
      const res = await putFile(owner, repo, branch, token, path, content, body.message, sha);
      results.wrote.push({ path, ok: true, res });
    } catch (e: any) {
      results.wrote.push({ path, ok: false, error: e?.message || String(e) });
    }
  }

  // Delete files
  for (const p of body.delete || []) {
    const path = (p || "").trim();
    if (!path) continue;
    try {
      const res = await deleteFile(owner, repo, branch, token, path, body.message);
      results.deleted.push({ path, ok: true, res });
    } catch (e: any) {
      results.deleted.push({ path, ok: false, error: e?.message || String(e) });
    }
  }

  return json(results);
}
