"use client";
import { useEffect, useState } from "react";

function getTopFive(): number[] {
  try {
    return JSON.parse(localStorage.getItem("top5") || "[]");
  } catch {
    return [];
  }
}
function saveTopFive(list: number[]) {
  try {
    localStorage.setItem("top5", JSON.stringify(list));
  } catch {}
}
function getRating(movieId: number): number {
  try {
    const raw = localStorage.getItem(`rating:${movieId}`);
    return raw ? parseFloat(raw) : 0;
  } catch {
    return 0;
  }
}

export default function TopFiveButton({
  movieId,
  title,
}: {
  movieId: number;
  title?: string;
}) {
  const [inTop, setInTop] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Initialize state from localStorage
  useEffect(() => {
    const list = getTopFive();
    setInTop(list.includes(movieId));
  }, [movieId]);

  // If a rating is set after page load, we might enable adding to Top 5
  useEffect(() => {
    const onRated = (e: Event) => {
      const detail = (e as CustomEvent).detail as { movieId: number; rating: number };
      if (detail?.movieId === movieId && detail.rating > 0) {
        // No direct UI change here, just clear messages
        setMsg(null);
      }
    };
    window.addEventListener("cinecircle:rated", onRated as EventListener);
    return () => window.removeEventListener("cinecircle:rated", onRated as EventListener);
  }, [movieId]);

  const toggle = () => {
    const currentRating = getRating(movieId);
    if (!inTop) {
      // Adding: require a rating first
      if (currentRating <= 0) {
        setMsg("Please set a star rating before adding to Top 5.");
        return;
      }
      const list = getTopFive();
      if (list.length >= 5) {
        setMsg("Your Top 5 is full. Remove one before adding another.");
        return;
      }
      list.push(movieId);
      saveTopFive(list);
      setInTop(true);
      setMsg(`Added${title ? ` “${title}”` : ""} to Top 5.`);
    } else {
      // Removing
      const list = getTopFive().filter((id) => id !== movieId);
      saveTopFive(list);
      setInTop(false);
      setMsg(`Removed${title ? ` “${title}”` : ""} from Top 5.`);
    }
    // Auto-clear the message
    setTimeout(() => setMsg(null), 1200);
  };

  return (
    <div>
      <button
        onClick={toggle}
        className={`px-3 py-2 rounded ${inTop ? "bg-gray-700" : "bg-purple-600 hover:bg-purple-500"}`}
        aria-pressed={inTop}
      >
        {inTop ? "★ In Top 5 (remove)" : "☆ Add to Top 5"}
      </button>
      {msg && <div className="text-xs mt-1 text-gray-300">{msg}</div>}
      <div className="text-xs text-gray-500 mt-1">
        (Max 5. Must be rated first.)
      </div>
    </div>
  );
}
