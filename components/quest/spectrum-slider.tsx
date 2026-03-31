"use client";

import { useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface SpectrumSliderProps {
  value: number | null;
  onChange: (value: number) => void;
  leftLabel: string;
  rightLabel: string;
}

const POSITIONS = [-3, -2, -1, 0, 1, 2, 3];

export default function SpectrumSlider({
  value,
  onChange,
  leftLabel,
  rightLabel,
}: SpectrumSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const raw = pct * 6 - 3;
      const snapped = Math.round(Math.max(-3, Math.min(3, raw)));
      onChange(snapped);
    },
    [onChange]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!trackRef.current) return;
      const touch = e.touches[0];
      const rect = trackRef.current.getBoundingClientRect();
      const pct = (touch.clientX - rect.left) / rect.width;
      const raw = pct * 6 - 3;
      const snapped = Math.round(Math.max(-3, Math.min(3, raw)));
      onChange(snapped);
    },
    [onChange]
  );

  const thumbPct = value !== null ? ((value + 3) / 6) * 100 : 50;

  return (
    <div className="w-full" role="group" aria-label={`${leftLabel} to ${rightLabel}`}>
      {/* Pole labels */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <p className="text-sm text-white/70 text-left max-w-[40%]">{leftLabel}</p>
        <p className="text-sm text-white/70 text-right max-w-[40%]">{rightLabel}</p>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-14 rounded-full bg-white/10 cursor-pointer touch-none"
        onClick={handleTrackClick}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchMove}
      >
        {/* Discrete tap points */}
        <div className="absolute inset-0 flex items-center justify-between px-4">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={(e) => {
                e.stopPropagation();
                onChange(pos);
              }}
              aria-label={`${pos < 0 ? leftLabel : pos > 0 ? rightLabel : "Neutral"} (${Math.abs(pos)} of 3)`}
              tabIndex={0}
              className={`h-11 w-11 flex items-center justify-center rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 ${
                value === pos
                  ? "text-white"
                  : pos === 0
                    ? "text-white/40"
                    : "text-white/20 hover:text-white/40"
              }`}
            >
              {pos === 0 ? "\u2022" : ""}
            </button>
          ))}
        </div>

        {/* Thumb */}
        {value !== null && (
          <motion.div
            className="absolute top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-primary)] shadow-[0_0_20px_var(--color-glow)]"
            animate={{ left: `${thumbPct}%` }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
      </div>

      {/* Discrete point fallback for accessibility */}
      <div className="flex items-center justify-between mt-2 px-2">
        {POSITIONS.map((pos) => (
          <button
            key={pos}
            onClick={() => onChange(pos)}
            className={`h-8 w-8 rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 ${
              value === pos
                ? "bg-[var(--color-primary)] text-white"
                : "bg-white/5 text-white/30 hover:bg-white/10"
            }`}
            aria-label={`Select ${pos}`}
            tabIndex={0}
          >
            {pos}
          </button>
        ))}
      </div>
    </div>
  );
}
