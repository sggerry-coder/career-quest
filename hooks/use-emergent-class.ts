"use client";

import { useEffect, useRef, useState } from "react";
import {
  deriveCharacterClass,
  type DerivedClass,
} from "@/lib/character/classes";
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
}

const UNNAMED: DerivedClass = {
  primary: "wanderer",
  secondary: null,
  isNamed: false,
};

/**
 * Combine a fresh derivation with what the student was last resolved to,
 * honouring the "may deepen, must not flip" rule.
 */
function resolveNext(prev: DerivedClass, raw: DerivedClass): DerivedClass {
  if (!prev.isNamed) {
    // Not yet named -- any result, including a first naming, is allowed.
    return raw;
  }
  if (!raw.isNamed) {
    // Already named; the fresh derivation didn't clear the naming bar this
    // time. Nothing new to fold in -- hold what we have.
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
}: UseEmergentClassInput): { derived: DerivedClass } {
  const [derived, setDerived] = useState<DerivedClass>(UNNAMED);
  const lastBlock = useRef<string | null>(null);
  // Mirrors `derived`, but only ever read/written inside effects (never
  // during render) so the resolved-vs-raw comparison in resolveNext always
  // sees the latest committed value without an extra render dependency.
  const currentDerived = useRef<DerivedClass>(UNNAMED);
  const lastAppliedPrimary = useRef<string | null>(null);

  // Latest scores without making them an effect dependency -- synced in its
  // own effect (never during render) so re-deriving stays gated on blockKey
  // alone and mid-block answers never rename the student.
  const latestRiasec = useRef(riasec);
  useEffect(() => {
    latestRiasec.current = riasec;
  });

  useEffect(() => {
    if (lastBlock.current === blockKey) return;
    lastBlock.current = blockKey;

    const raw = deriveCharacterClass(latestRiasec.current);
    const resolved = resolveNext(currentDerived.current, raw);

    currentDerived.current = resolved;
    setDerived(resolved);

    // Apply the theme whenever the resolved primary actually changes, not
    // only on first naming -- and never reapply when it hasn't changed,
    // since that would cause a needless visible repaint.
    if (resolved.primary !== lastAppliedPrimary.current) {
      lastAppliedPrimary.current = resolved.primary;
      applyClassTheme(resolved.primary);
    }
  }, [blockKey]);

  return { derived };
}
