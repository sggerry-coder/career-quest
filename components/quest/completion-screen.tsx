"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { chapterLabel } from "@/lib/copy/chapter";
import { useScreenChange } from "@/hooks/use-screen-change";

/**
 * The celebration. Mounting this screen *means the results are saved* — the
 * session page renders it only once the final save is confirmed, so nothing
 * here needs to represent or recover from a failure. A failed save shows
 * SaveFailedScreen instead, and this screen is never reached.
 */
interface CompletionScreenProps {
  tone: "quest" | "explorer";
  classLabel: string;
  /**
   * The class the reveal showed, before the confirmatory round. When it
   * differs from classLabel the change is named here: the confirmatory
   * questions feed the interest type closest to overtaking the leader, so
   * they can genuinely change the reading, and a student who was told
   * "Guardian" must not simply find "Vanguard-Guardian" on the dashboard.
   * Omit, or pass the same string, when nothing moved.
   */
  previousClassLabel?: string;
  scoreState: {
    riasec: Record<string, number>;
    strengths: string[];
  };
  /** RIASEC scores snapshotted at confirmatory start (P1.3), if taken. */
  riasecSnapshot?: Record<string, number> | null;
  onViewDashboard: () => void;
  onSaveExit: () => void;
}

const RIASEC_LABELS: Record<string, string> = {
  R: "Maker",
  I: "Investigator",
  A: "Creator",
  S: "Helper",
  E: "Leader",
  C: "Organizer",
};

export interface ProfileDelta {
  key: string;
  label: string;
  delta: number;
}

/**
 * Compare the RIASEC snapshot taken at confirmatory start against the final
 * scores and return the biggest movements (max 3, |delta| >= 1 point).
 * Returns [] when there is no snapshot or nothing moved.
 */
export function computeProfileDeltas(
  snapshot: Record<string, number> | null | undefined,
  current: Record<string, number>
): ProfileDelta[] {
  if (!snapshot) return [];
  const deltas: ProfileDelta[] = [];
  for (const [key, label] of Object.entries(RIASEC_LABELS)) {
    const before = Math.round(snapshot[key] ?? 0);
    const after = Math.round(current[key] ?? 0);
    const delta = after - before;
    if (Math.abs(delta) >= 1) {
      deltas.push({ key, label, delta });
    }
  }
  return deltas
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);
}

export default function CompletionScreen({
  tone,
  classLabel,
  previousClassLabel,
  scoreState,
  riasecSnapshot = null,
  onViewDashboard,
  onSaveExit,
}: CompletionScreenProps): React.JSX.Element {
  const hasFired = useRef(false);

  // Fire confetti on mount (once)
  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    // Respect reduced motion preference
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    (async () => {
      try {
        const confetti = (await import("canvas-confetti")).default;
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#a855f7", "#6366f1", "#2dd4bf", "#f59e0b"],
        });
      } catch {
        // Silent catch -- confetti is cosmetic only
      }
    })();
  }, []);

  const heading = `${tone === "quest" ? "Quest " : ""}${chapterLabel(1, tone)} Complete`;
  const headingRef = useScreenChange<HTMLHeadingElement>(heading);
  const subheading =
    tone === "quest"
      ? "Your profile has been forged!"
      : "Here\u2019s what we discovered.";

  const topStrength =
    scoreState.strengths.length > 0 ? scoreState.strengths[0] : null;

  // Confirmatory payoff (P1.3): show how the 5 confirmatory answers moved
  // the profile relative to the snapshot taken when the round began.
  const profileDeltas = computeProfileDeltas(riasecSnapshot, scoreState.riasec);
  const sharpenedHeading =
    tone === "quest" ? "Your legend sharpened" : "Your profile sharpened";
  const steadyText =
    tone === "quest"
      ? "Your final answers held firm — a steady hand makes a clear prophecy."
      : "Your final answers were consistent — that makes your profile more reliable.";

  // The confirmatory round can move the interest chart far enough that it no
  // longer reads as the class the reveal showed. Say so plainly rather than
  // letting the dashboard be the first place the student notices.
  const classChanged =
    previousClassLabel !== undefined && previousClassLabel !== classLabel;
  const classChangeText =
    tone === "quest"
      ? `Those last answers redrew your class: ${previousClassLabel} → ${classLabel}.`
      : `Those last answers changed your closest match: ${previousClassLabel} → ${classLabel}.`;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      {/* Animated checkmark */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          aria-hidden="true"
        >
          <motion.circle
            cx="20"
            cy="20"
            r="18"
            stroke="#2dd4bf"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          <motion.path
            d="M12 20l6 6 10-12"
            stroke="#2dd4bf"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          />
        </svg>
      </motion.div>

      {/* Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.8 }}
        ref={headingRef}
        className="text-2xl font-semibold text-white text-center focus:outline-none"
      >
        {heading}
      </motion.h1>

      {/* Subheading */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 1.0 }}
        className="text-sm text-white/60 text-center"
      >
        {subheading}
      </motion.p>

      {/* Static summary cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 1.4 }}
        className="flex flex-row gap-3 max-w-sm w-full justify-center"
      >
        {/* Class card */}
        <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {classLabel}
          </p>
          <p className="text-[11px] text-white/65 mt-0.5">Your Archetype</p>
        </div>

        {/* Top strength card */}
        {topStrength && (
          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {topStrength}
            </p>
            <p className="text-[11px] text-white/65 mt-0.5">Top Strength</p>
          </div>
        )}
      </motion.div>

      {/* Confirmatory before/after delta card (P1.3) */}
      {(riasecSnapshot || classChanged) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut", delay: 1.6 }}
          className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 max-w-sm w-full"
        >
          <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
            {sharpenedHeading}
          </p>
          {classChanged && (
            <p className="text-sm text-white/80 mb-2">{classChangeText}</p>
          )}
          {profileDeltas.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {profileDeltas.map((d) => (
                <li
                  key={d.key}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-white/80">{d.label}</span>
                  <span
                    className={`font-mono font-semibold ${
                      d.delta > 0 ? "text-[#2dd4bf]" : "text-white/50"
                    }`}
                  >
                    {d.delta > 0 ? `+${d.delta}` : `${d.delta}`}
                  </span>
                </li>
              ))}
            </ul>
          ) : classChanged ? null : (
            <p className="text-sm text-white/60">{steadyText}</p>
          )}
        </motion.div>
      )}

      {/* CTA buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 1.8 }}
        className="flex flex-col gap-3 w-full max-w-xs"
      >
        <button
          onClick={onViewDashboard}
          className="rounded-xl bg-[var(--cq-primary,#8b5cf6)] px-8 py-3 font-semibold text-white shadow-[0_0_20px_var(--cq-glow,rgba(139,92,246,0.3))] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
        >
          View Dashboard
        </button>
        <button
          onClick={onSaveExit}
          className="rounded-xl bg-transparent border border-white/20 px-8 py-3 font-semibold text-white/70 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
        >
          Save &amp; Exit
        </button>
      </motion.div>
    </div>
  );
}
