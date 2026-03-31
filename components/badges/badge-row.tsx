"use client";

import { BadgeDefinition } from "@/data/badges";

interface BadgeRowProps {
  allBadges: BadgeDefinition[];
  unlockedIds: string[];
}

const BADGE_ICONS: Record<string, string> = {
  rocket: "\u{1F680}",
  "magnifying-glass": "\u{1F50D}",
  compass: "\u{1F9ED}",
  map: "\u{1F5FA}\u{FE0F}",
  clipboard: "\u{1F4CB}",
  scroll: "\u{1F4DC}",
};

export default function BadgeRow({ allBadges, unlockedIds }: BadgeRowProps) {
  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wider">
        Inventory
      </h3>
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
        {allBadges.map((badge) => {
          const isUnlocked = unlockedIds.includes(badge.id);
          return (
            <div
              key={badge.id}
              className={`flex flex-col items-center gap-1 flex-shrink-0 ${
                isUnlocked ? "" : "opacity-40"
              }`}
              title={isUnlocked ? badge.description : "???"}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${
                  isUnlocked
                    ? "bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40"
                    : "bg-white/5 border border-white/10"
                }`}
              >
                {isUnlocked
                  ? BADGE_ICONS[badge.icon] ?? "\u{2728}"
                  : "\u{1F512}"}
              </div>
              <span
                className={`text-[10px] max-w-[56px] text-center truncate ${
                  isUnlocked ? "text-white/60" : "text-white/20"
                }`}
              >
                {isUnlocked ? badge.name : "???"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
