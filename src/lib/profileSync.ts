// src/lib/profileSync.ts
"use client";

// Minimal snapshot we send to the server
type Snapshot = {
  top5: number[];
  watchlist: number[];
  ratings: Record<string, number>;
};

// --- read local Top 5 / Watchlist / Ratings (same shapes we already use) ---
function readTopFive(): number[] {
  try {
    const raw = localStorage.getItem("top5");
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    const ids = Array.isArray(arr) ? arr : [];
    const clean = ids.map(Number).filter((n) => Number.isFinite(n) && n > 0);
    return Array.from(new Set(clean)).slice(0, 5);
  } catch {
    return [];
  }
}

type WatchItem = { movieId: number; title?: string };
function readWatchlist(): number[] {
  try {
    const raw = localStorage.getItem("watchlist");
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    const items: WatchItem[] = Array.isArray(arr) ? arr : [];
    const ids = items.map((i) => Number((i as any).movieId)).filter((n) => Number.isFinite(n) && n > 0);
    return Array.from(new Set(ids));
  } catch {
    return [];
  }
}

function readRatings(): Record<string, number> {
  const out: Record<string, number> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || "";
      if (!key.startsWith("rating:")) continue;
      const idStr = key.split(":")[1];
      const movieId = Number(idStr);
      if (!movieId) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      let value = 0;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && "value" in parsed) {
          value = Number((parsed as any).value);
        } else {
          value = parseFloat(raw);
        }
      } catch {
        value = parseFloat(raw);
      }
      if (!isNaN(value) && value > 0) {
        // clamp to 0.5..5.0 in 0.5 steps
        const v = Math.min(5, Math.max(0.5, Math.round(value * 2) / 2));
        out[String(movieId)] = v;
      }
    }
  } catch {}
  return out;
}

// --- identity comes from the browser (set once via /profile/me) ---
function getIdentity(): { username?: string; displayName?: string } {
  try {
    const raw = localStorage.getItem("cinecircle_identity");
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object") return obj as any;
  } catch {}
  return {};
}

// POST to /api/profile/:username so /u/:username is always up-to-date
export async function syncProfileNow(): Promise<void> {
  try {
    const id = getIdentity();
    const username = id.username?.toLowerCase();
    if (!username) return; // no identity set → nothing to sync

    const snapshot: Snapshot = {
      top5: readTopFive(),
      watchlist: readWatchlist(),
      ratings: readRatings(),
    };

    await fetch(`/api/profile/${encodeURIComponent(username)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    });
  } catch {
    // best-effort; OK to fail silently
  }
}

// Debounced helper to avoid spamming the server if multiple actions happen quickly
let _timer: any = null;
export function syncProfileDebounced(delayMs = 400) {
  if (_timer) clearTimeout(_timer);
  _timer = setTimeout(() => {
    _timer = null;
    void syncProfileNow();
  }, delayMs);
}
