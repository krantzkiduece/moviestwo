// src/components/LocalRating.tsx
"use client";
import { useEffect, useState } from "react";
import StarRating from "./StarRating";
import { syncProfileDebounced } from "../lib/profileSync";

export default function LocalRating({ movieId, title }: { movieId: number; title?: string }) {
  const storageKey = `rating:${movieId}`;
  const [rating, setRating] = useState(0);
  const [saved, setSaved] = useState<null | string>(null);

  // Read existing rating (supports old "3.5" and new JSON { value, updatedAt })
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
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
      if (!isNaN(value)) setRating(value);
    } catch {}
  }, [storageKey]);

  const handleChange = async (v: number) => {
    setRating(v);
    try {
      // Save locally with timestamp
      localStorage.setItem(storageKey, JSON.stringify({ value: v, updatedAt: Date.now() }));

      // Let other components react (e.g., WatchlistGallery refresh)
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("cinecircle:rated", { detail: { movieId, rating: v } })
        );
      }

      // Best-effort activity log (Friends’ Trending)
      try {
        await fetch("/api/activity/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "rated", movieId }),
        });
      } catch {}

      // ✅ Auto-sync your public profile (no Publish step needed)
      syncProfileDebounced();

      setSaved(`Saved ${v.toFixed(1)} ★`);
      setTimeout(() => setSaved(null), 1200);
    } catch {}
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <StarRating value={rating} onChange={handleChange} />
        <span className="text-sm text-gray-300">
          {rating ? `${rating.toFixed(1)} / 5` : "No rating yet"}
        </span>
      </div>
      {saved && <div className="text-xs text-green-400 mt-1">{saved}</div>}
      <div className="text-xs text-gray-500 mt-1">(Saved in your browser and auto-synced.)</div>
    </div>
  );
}
