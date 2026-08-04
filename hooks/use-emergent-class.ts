"use client";

import { useEffect, useRef, useState } from "react";
import {
  deriveCharacterClass,
  isCharacterClassId,
  type DerivedClass,
} from "@/lib/character/classes";
import { isInterestBlockComplete } from "@/lib/character/evidence";
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
  /**
   * How many interest answers stand behind each type, from
   * buildRiasecEvidence. Without it a type the student skipped every question
   * for scores 0 and is ranked as though they had rated it at the bottom of
   * the scale, so the naming rules find gaps that only exist because nothing
   * was asked. See deriveClassLabel. Optional: omit it and every type counts,
   * which is right for a student who answered everything and wrong for one
   * who did not.
   */
  riasecEvidence?: Record<string, number>;
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
function resolveNext(prev: DerivedClass, raw: DerivedClass): DerivedClass {
  if (!prev.isNamed) {
    // Not yet named -- any result, including a first naming, is allowed.
    // Callers only reach here once the interest block is finished (see the
    // gate in the derivation effect), so a Rogue landing here is a genuine
    // "no clear lean" answer over the whole instrument, not a marginal
    // mid-block lead, and locks like any other class.
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
  riasecEvidence,
  blockKey,
  restoredClass,
}: UseEmergentClassInput): { derived: DerivedClass; namingEventId: number } {
  const [derived, setDerived] = useState<DerivedClass>(() =>
    seedFromRestored(restoredClass)
  );
  // Monotonic, not a transient boolean: a boolean set during render was tried
  // before and lost, because React's development double-render discarded the
  // second pass before any consumer could see it. A number that only ever
  // increases survives a discarded render -- a consumer just compares it
  // against what it last saw. Set only inside the block-boundary effect
  // below, never during render.
  const [namingEventId, setNamingEventId] = useState(0);

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

  // Latest scores without making them an effect dependency -- synced in their
  // own effect (never during render) so re-deriving stays gated on blockKey
  // alone and mid-block answers never rename the student.
  const latestRiasec = useRef(riasec);
  const latestEvidence = useRef(riasecEvidence);
  useEffect(() => {
    latestRiasec.current = riasec;
    latestEvidence.current = riasecEvidence;
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

    if (!currentDerived.current.isNamed && !isInterestBlockComplete(blockKey)) {
      // Interest answers are still to come, so any naming made here would be
      // made on part of the evidence and then locked against the rest. That
      // is exactly what a quit-and-resume used to do: resuming at question 15
      // moved the block, fired this effect, and named the student from the
      // rating items alone -- before the two ipsative rankings, 30% of the
      // merged interest score, had been asked. Wait for the next boundary.
      //
      // Only a *first* naming is withheld. A restored or already-named
      // student takes the derivation path below every time, so the gate can
      // never revoke a name that was earned.
      //
      // Once the interest block is finished this branch is skipped however
      // little was answered: a student who skipped most of it has nothing
      // more coming before the reveal, and deriveCharacterClass already
      // returns an honest Wanderer when there is no lead at all.
      return;
    }

    const raw = deriveCharacterClass(
      latestRiasec.current,
      latestEvidence.current
    );
    // Captured before currentDerived.current is overwritten below. When a
    // valid restoredClass exists, it was already folded into
    // currentDerived.current as an already-named class -- either by the seed
    // used to initialise this ref, or by the "commit a restored class"
    // effect above, which runs first within the same commit -- so this is
    // false only for a student genuinely unnamed going into this boundary,
    // never for one merely resuming a naming they already had.
    const wasNamed = currentDerived.current.isNamed;
    const resolved = resolveNext(currentDerived.current, raw);

    currentDerived.current = resolved;
    setDerived(resolved);

    if (resolved.isNamed && !wasNamed) {
      // A genuine first naming: unnamed going in, named coming out. Fires
      // once -- deepening an already-named class (wasNamed already true)
      // never re-triggers it, and a resumed, already-named student never
      // looks like this transition in the first place.
      setNamingEventId((n) => n + 1);
    }

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

  return { derived: effective, namingEventId };
}
