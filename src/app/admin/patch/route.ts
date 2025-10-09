"use server";

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Simple admin gate: cc_user cookie must match ADMIN_USER
function isAdmin() {
  const c = cookies().get("cc_user")?.value;
  const admin = process.env.ADMIN_USER ?? "admin";
  return c === admin;
}

type UpsertBody = {
  path: string;             // e.g. "src/app/.auth-test.txt"
  content?: string;         // UTF-8 string content (will be base64 encoded)
  base64?: string;          // optional pre-encoded base64 content
  message?: string;         // commit message
  branch?: string;          // branch name, defaults to env branch or "main"
};

const GITHUB_API = "https://api.github.com";

function reqInit(method: string, token: string, body?: unknown): RequestInit {
  return {
    method,
    headers: {
      "Authorization": `token ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  };
}

async function getFileSha(owner: string, repo: string, path: string, ref: string, token: string) {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`;
  const res = await fetch(url, reqInit("GET", token));
  if (res.status === 404) return { sha: undefined as string | undefined, status: 404 };
  if (!res.ok) {
    const error = await res.text();
    return { sha: undefined, status: res.status, error };
  }
  const json = await res.json();
  if (json && typeof json.sha === "string") {
    return { sha: json.sha as string, status: 200 };
  }
  return { sha: undefined, status: 200 };
}

function b64(input: string) {
  return Buffer.from(input, "utf8").toString("base64");
}

export async function POST(req: NextRequest) {
  if (!isAdmin()) {
    return NextResponse.json(
      { error: "unauthorized. visit /admin and log in as admin first" },
      { status: 401 }
    );
  }

  const token = process.env.GITHUB_TOKEN;
  const repoFull = process.env.GITHUB_REPO; // "owner/repo"
  const defaultBranch = process.env.GITHUB_DEFAULT_BRANCH || "main";

  if (!token || !repoFull) {
    return NextResponse.json(
      { error: "missing GITHUB_TOKEN or GITHUB_REPO env var" },
      { status: 500 }
    );
  }

  let body: UpsertBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const branch = body.branch || defaultBranch;
  const [owner, repo] = repoFull.split("/");
  if (!owner || !repo) {
    return NextResponse.json({ error: "GITHUB_REPO must be 'owner/repo'" }, { status: 500 });
  }
  if (!body.path) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  const contentBase64 = body.base64 ?? (body.content ? b64(body.content) : undefined);
  if (!contentBase64) {
    return NextResponse.json({ error: "content or base64 is required" }, { status: 400 });
  }

  // Discover SHA if file already exists
  const { sha, status, error } = await getFileSha(owner, repo, body.path, branch, token);
  if (status !== 200 && status !== 404) {
    return NextResponse.json(
      {
        wrote: [{ path: body.path, ok: false, status, error: error ?? "failed to GET existing file" }],
      },
      { status: 502 }
    );
  }

  // PUT create/update
  const putUrl = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(body.path)}`;
  const putBody: any = {
    message: body.message || `chore(admin): update ${body.path}`,
    content: contentBase64,
    branch,
  };
  if (sha) putBody.sha = sha;

  const putRes = await fetch(putUrl, reqInit("PUT", token, putBody));
  const text = await putRes.text();

  if (!putRes.ok) {
    let message: string | undefined;
    try {
      const j = JSON.parse(text);
      message = j?.message || text;
    } catch {
      message = text;
    }
    return NextResponse.json(
      {
        wrote: [
          {
            path: body.path,
            ok: false,
            status: putRes.status,
            error: message,
            hint: "Verify token scopes (contents:read/write), repo visibility, and branch name.",
          },
        ],
      },
      { status: 502 }
    );
  }

  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {}

  return NextResponse.json({
    wrote: [
      {
        path: body.path,
        ok: true,
        branch,
        commitUrl: json?.commit?.html_url,
        contentUrl: json?.content?.html_url,
        sha: json?.content?.sha,
      },
    ],
  });
}
