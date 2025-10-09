// src/components/SessionBar.tsx
"use client";

import { useEffect, useState } from "react";

// Read identity (set at login) for display only
function readIdentity(): { username?: string; displayName?: string } {
  try {
    const raw = localStorage.getItem("cinecircle_identity");
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object") return obj as any;
  } catch {}
  return {};
}

// Clear local browser data on logout so one user's data never leaks into another.
function purgeLocal() {
  try {
    localStorage.removeItem("cinecircle_identity");
    localStorage.removeItem("top5");
    localStorage.removeItem("watchlist");
    // remove all rating:* keys
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || "";
      if (k.startsWith("rating:")) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch {}
}

export default function SessionBar() {
  const [name, setName] = useState<string>("");

  useEffect(() => {
    const id = readIdentity();
    const label = id.displayName || id.username || "";
    setName(label);
  }, []);

  const logout = async () => {
    try {
      await fetch("/api/session/logout", { method: "POST" });
    } catch {}
    purgeLocal();
    window.location.href = "/login";
  };

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-900 border border-gray-800 px-3 py-2">
      <div className="text-sm text-gray-300">
        {name ? (
          <>
            Signed in as <span className="font-semibold">{name}</span>
          </>
        ) : (
          <>Signed in</>
        )}
      </div>
      <button
        onClick={logout}
        className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded"
      >
        Logout
      </button>
    </div>
  );
}
