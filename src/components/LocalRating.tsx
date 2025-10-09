"use client";
import { useEffect, useState } from "react";
import StarRating from "./StarRating";

export default function LocalRating({ movieId, title }: { movieId: number; title?: string }) {
  const storageKey = `rating:${movieId}`;
  const [rating, setRating] = useState(0);
  const [saved, setSaved] = useState<null | string>(null);

  // Read existing rating (supports old format "3.5" and simple string values)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      let value = 0;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && "value" in parsed) {
          value = Number(parsed.value);
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
      // keep simple storage (we can add timestamps later)
      localStorage.setItem(storageKey, JSON.stringify({ value: v }));

      // Tell other components locally (so Watchlist auto-removes)
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("cinecircle:rated", { detail: { movieId, rating: v } })
        );
      }

      // 🌟 Send an activity event to the server so it appears in Friends’ Trending
      try {
        await fetch("/api/activity/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "rated", movieId }),
        });
      } catch {
        // If this fails, ignore—local rating still works
      }

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
      <div className="text-xs text-gray-500 mt-1">(Saved in your browser for now.)</div>
    </div>
  );
}
