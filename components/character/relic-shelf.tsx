"use client";

import { motion } from "framer-motion";
import type { Relic } from "@/lib/character/relics";

interface RelicShelfProps {
  relics: Relic[];
  tone: "quest" | "explorer";
}

/**
 * Relics with the reason attached. The reason is the point — a badge with no
 * explanation is decoration, one that says what you did is evidence.
 */
export default function RelicShelf({
  relics,
  tone,
}: RelicShelfProps): React.JSX.Element | null {
  if (relics.length === 0) return null;

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wider">
        {tone === "quest" ? "Relics" : "What you showed"}
      </h3>
      <ul className="flex flex-col gap-2">
        {relics.map((relic, index) => (
          <motion.li
            key={relic.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
            className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2"
          >
            <span className="text-xl" aria-hidden="true">
              {relic.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {relic.name}
              </p>
              <p className="text-[11px] text-white/65">
                You showed this {relic.timesShown} times
              </p>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
