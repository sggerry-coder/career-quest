"use client";

import { useEffect, useRef, useState } from "react";
import {
  deriveCharacterClass,
  isCharacterClassId,
  type DerivedClass,
} from "@/lib/character/classes";
import { MIN_INTEREST_RESPONSES } from "@/lib/character/evidence";
import { applyClassTheme } from "@/lib/theme";

/**
 * Lets the class crystallise from the student's answers.
 *
 * Re-derives only when the block changes, never per answer. A class that
 * flipped question by question would feel like a slot machine rather than
 * something becoming true.
 *
 * Once a student has been named, the primary class is locked: later block
 * boundaries may fill in or change the secondary as new signal comes in,
 * but must never flip the primary. An unnamed student (Wanderer) is not
 * locked -- they have not been named yet, so becoming anything is a first
 * naming, not a flip.
 */

interface UseEmergentClassInput {
  riasec: Record<string, number>;
  /** Current question block. Deriving is gated on this changing. */
  blockKey: string;
  /**
   * The primary class id restored from a mid-quest checkpoint, when the
   * student resumed. Without it the hook starts every mount as an unnamed
   * Wanderer, resolveNext takes its "anything is allowed" branch, and the
   * locked primary is lost: a Guardian-Bard who quit came back as a
   * Bard-Guardian, with the theme following. May deepen, must not flip --
   * across a resume too. Ignored when absent or "wanderer", because a
   * Wanderer was never named and so has nothing to hold.
   */
  restoredClass?: string | null;
  /**
   * Total interest (RIASEC) answers recorded so far, across all six types.
   * The evidence gate for a *first* naming: below MIN_INTEREST_RESPONSES the
   * hook will not name an unnamed student at a block boundary, however
   * decisive the raw derivation looks -- five warm-up answers used to be
   * enough to name (and lock) a student before the questions that actually
   * measure interests had run. An already-named or restored student is never
   * affected: the gate governs earning a class that has not been earned yet,
   * it never revokes one that already has.
   */
  interestResponses: number;
  /**
   * Whether the interest block (riasec + riasec_mi) has finished. Governs
   * whether a fresh Rogue (deriveCharacterClass's EXPLORER / no-clear-lean
   * outcome) counts as a first naming. Mid-quest a marginal lead is not
   * final -- more interest answers are still coming that could resolve it
   * into a real class -- so Rogue is shown but left unlocked so a later
   * boundary can still claim the student. Once the interest block is done,
   * an unresolved lead is a genuine answer and Rogue locks like any other
   * class. Defaults to false, the safe assumption for callers that have not
   * said otherwise.
   */
  interestBlockComplete?: boolean;
}

const UNNAMED: DerivedClass = {
  primary: "wanderer",
  secondary: null,
  isNamed: false,
};

/**
 * Turn a restored class id into an already-named primary. The secondary is
 * deliberately dropped and re-derived from the restored scores: only the
 * primary is locked, so only the primary needs carrying across the resume.
 */
function seedFromRestored(restored?: string | null): DerivedClass {
  if (!isCharacterClassId(restored) || restored === "wanderer") return UNNAMED;
  return { primary: restored, secondary: null, isNamed: true };
}

/**
 * Combine a fresh derivation with what the student was last resolved to,
 * honouring the "may deepen, must not flip" rule.
 */
function resolveNext(
  prev: DerivedClass,
  raw: DerivedClass,
  interestBlockComplete: boolean
): DerivedClass {
  if (!prev.isNamed) {
    if (raw.primary === "rogue" && !interestBlockComplete) {
      // A fresh, still-unnamed derivation landed on Rogue while the
      // interest block isn't finished. Rogue counts as named -- "open to
      // anything" is a real answer -- but only once there is nothing left
      // to change its mind: mid-block, a marginal lead is not final, and
      // locking it here would close the door on a later boundary resolving
      // it into a real class. Show it, don't lock it.
      return { primary: "rogue", secondary: null, isNamed: false };
    }
    // Not yet named -- any other result, including a first naming, is
    // allowed.
    return raw;
  }
  if (!raw.isNamed) {
    // Already named; the fresh derivation didn't clear the naming bar this
    // time. Nothing new to fold in -- hold what we have.
    return prev;
  }
  if (raw.primary === "rogue") {
    // "Rogue" (deriveCharacterClass's EXPLORER/no-clear-lean outcome) means
    // the fresh signal got *less* certain, not that a confident second
    // class arrived. Recording it as a secondary would claim more than the
    // data earned -- a Guardian whose scores broaden must stay Guardian,
    // not become "Guardian-Rogue". Hold what we have.
    return prev;
  }
  if (raw.primary === prev.primary) {
    // Top signal still agrees with the locked primary -- ordinary
    // deepening, e.g. Guardian -> Guardian-Mage.
    return { primary: prev.primary, secondary: raw.secondary, isNamed: true };
  }
  // The top signal has moved to a different class, but the primary is
  // locked. The class that would have taken over becomes the secondary
  // instead of flipping the primary, e.g. locked Guardian + fresh
  // Bard-Guardian -> Guardian-Bard, not Bard-Guardian.
  return { primary: prev.primary, secondary: raw.primary, isNamed: true };
}

export function useEmergentClass({
  riasec,
  blockKey,
  restoredClass,
  interestResponses,
  interestBlockComplete = false,
}: UseEmergentClassInput): { derived: DerivedClass } {
  const [derived, setDerived] = useState<DerivedClass>(() =>
    seedFromRestored(restoredClass)
  );

  // Folding in a restored class is a pure function of props and state -- it
  // only ever upgrades an unnamed student -- so it happens during render
  // rather than in an effect. The first paint after a resume then already
  // shows the class the student was named, with no Wanderer flicker.
  const seeded = seedFromRestored(restoredClass);
  const effective: DerivedClass =
    derived.isNamed || !seeded.isNamed ? derived : seeded;

  const lastBlock = useRef<string | null>(null);
  // Mirrors the resolved class, but only ever read/written inside effects
  // (never during render) so the resolved-vs-raw comparison in resolveNext
  // always sees the latest committed value without an extra render
  // dependency.
  const currentDerived = useRef<DerivedClass>(effective);
  // Seeded from the restored class so a resume does not repaint a theme the
  // pre-paint script has already applied.
  const lastAppliedPrimary = useRef<string | null>(
    effective.isNamed ? effective.primary : null
  );

  // Latest scores, evidence count, and interest-block completion without
  // making any of them an effect dependency -- synced in their own effect
  // (never during render) so re-deriving stays gated on blockKey alone and
  // mid-block answers never rename the student.
  const latestRiasec = useRef(riasec);
  const latestInterestResponses = useRef(interestResponses);
  const latestInterestBlockComplete = useRef(interestBlockComplete);
  useEffect(() => {
    latestRiasec.current = riasec;
    latestInterestResponses.current = interestResponses;
    latestInterestBlockComplete.current = interestBlockComplete;
  });

  // Commit a restored class that arrives after mount -- the resume decision
  // is made by the student tapping "Resume", so the checkpoint lands a render
  // or more after the hook first ran. Declared BEFORE the derivation effect
  // so that when the restore and the block change land in the same commit,
  // the lock is in place before the first re-derivation reads it.
  useEffect(() => {
    if (currentDerived.current.isNamed) return;
    const restored = seedFromRestored(restoredClass);
    if (!restored.isNamed) return;

    currentDerived.current = restored;
    if (restored.primary !== lastAppliedPrimary.current) {
      lastAppliedPrimary.current = restored.primary;
      applyClassTheme(restored.primary);
    }
  }, [restoredClass]);

  useEffect(() => {
    if (lastBlock.current === blockKey) return;
    lastBlock.current = blockKey;

    if (
      latestInterestResponses.current < MIN_INTEREST_RESPONSES &&
      !currentDerived.current.isNamed
    ) {
      // Not enough interest evidence yet to earn a first naming. A
      // restored or already-named student is untouched by this branch --
      // currentDerived.current.isNamed is true for them -- so the gate only
      // ever withholds a naming that has not happened yet; it never revokes
      // one that has. Try again at the next block boundary.
      return;
    }

    const raw = deriveCharacterClass(latestRiasec.current);
    const resolved = resolveNext(
      currentDerived.current,
      raw,
      latestInterestBlockComplete.current
    );

    currentDerived.current = resolved;
    setDerived(resolved);

    // Apply the theme whenever the resolved primary actually changes, not
    // only on first naming -- and never reapply when it hasn't changed,
    // since that would cause a needless visible repaint. Never apply it at
    // all while unnamed (Wanderer): a Wanderer hasn't earned a colour, and
    // by the time the session mounts, the landing page/dashboard have
    // already applied the student's real theme -- overwriting it with the
    // default slate on every mount/resume would be strictly wrong.
    if (resolved.isNamed && resolved.primary !== lastAppliedPrimary.current) {
      lastAppliedPrimary.current = resolved.primary;
      applyClassTheme(resolved.primary);
    }
  }, [blockKey]);

  return { derived: effective };
}
