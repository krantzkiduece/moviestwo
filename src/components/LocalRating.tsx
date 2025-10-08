"use client";
import { useEffect, useState } from "react";
import StarRating from "./StarRating";

export default function LocalRating({ movieId, title }: { movieId: number; title?: string }) {
  const storageKey = `rating:${movieId}`;
  const [rating, setRating] = useState(0);
  const [saved, setSaved] = useState<null | string>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setRating(parseFloat(raw));
    } catch {}
  }, [storageKey]);

  const handleChange = (v: number) => {
    setRating(v);
    try {
      localStorage.setItem(storageKey, String(v));
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
      <div className="text-xs text-gray-500 mt-1">
        (Saved in your browser for now.)
      </div>
    </div>
  );
}
