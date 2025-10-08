"use client";
import { useRef } from "react";

type Props = {
  value: number;                 // 0–5 in 0.5 steps
  onChange: (v: number) => void;
  size?: number;                 // star size (px)
  disabled?: boolean;
};

export default function StarRating({ value, onChange, size = 28, disabled }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const clamped = Math.max(0, Math.min(5, value || 0));
  const pct = (clamped / 5) * 100;

  const onClick = (e: React.MouseEvent) => {
    if (disabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = e.clientX - rect.left;
    const p = Math.max(0, Math.min(1, dx / rect.width));
    // snap to 0.5 increments
    const v = Math.round(p * 10) / 2;
    onChange(v);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowRight") onChange(Math.min(5, clamped + 0.5));
    if (e.key === "ArrowLeft") onChange(Math.max(0, clamped - 0.5));
  };

  const StarRow = ({ fill }: { fill: string }) => (
    <div className="flex">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="shrink-0"
        >
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.85L18.18 22 12 18.56 5.82 22 7 14.12 2 9.27l6.91-1.01L12 2z"
            fill={fill}
          />
        </svg>
      ))}
    </div>
  );

  return (
    <div
      ref={ref}
      role="slider"
      aria-label="Star rating"
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={clamped}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={onKeyDown}
      onClick={onClick}
      className={`relative inline-block cursor-pointer select-none ${disabled ? "opacity-60 cursor-default" : ""}`}
      style={{ width: size * 5, height: size }}
    >
      {/* empty stars */}
      <div className="absolute inset-0">
        <StarRow fill="#3f3f46" />
      </div>
      {/* filled stars clipped to percentage */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pct}%` }}>
        <StarRow fill="#fbbf24" />
      </div>
    </div>
  );
}
