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

export function useEmergentClass({
  riasec,
  blockKey,
}: UseEmergentClassInput): { derived: DerivedClass; justNamed: boolean } {
  const [derived, setDerived] = useState<DerivedClass>(UNNAMED);
  const [justNamed, setJustNamed] = useState(false);
  const lastBlock = useRef<string | null>(null);
  const wasNamed = useRef(false);

  // Latest scores without making them an effect dependency -- synced in its
  // own effect (never during render) so re-deriving stays gated on blockKey
  // alone and mid-block answers never rename the student.
  const latestRiasec = useRef(riasec);
  useEffect(() => {
    latestRiasec.current = riasec;
  });

  // `justNamed` must be true for exactly one render -- the render where the
  // naming happens -- then false on every later render, even one where the
  // block hasn't changed again (e.g. the session page re-rendering for an
  // unrelated reason). A `useEffect` that reacts to `justNamed` itself would
  // reset it inside the very same commit/`act()` batch that set it true, so
  // a caller could never observe `true` at all -- verified directly: a
  // naive `useEffect(() => { if (justNamed) setJustNamed(false) }, [justNamed])`
  // collapses back to `false` before anything outside this hook can read it,
  // because React flushes effect-triggered re-renders to a fixed point
  // before yielding control back to the caller. Comparing against a ref
  // during render is the only mechanism that clears the flag on a later,
  // externally-triggered render without also cancelling it out first.
  const justNamedShown = useRef(false);
  // eslint-disable-next-line react-hooks/refs -- deliberate: see comment above.
  if (justNamed && justNamedShown.current) {
    setJustNamed(false);
  } else {
    // eslint-disable-next-line react-hooks/refs -- deliberate: see comment above.
    justNamedShown.current = justNamed;
  }

  useEffect(() => {
    if (lastBlock.current === blockKey) return;
    lastBlock.current = blockKey;

    const next = deriveCharacterClass(latestRiasec.current);
    setDerived(next);

    const becameNamed = next.isNamed && !wasNamed.current;
    if (becameNamed) {
      wasNamed.current = true;
      setJustNamed(true);
      applyClassTheme(next.primary);
    }
  }, [blockKey]);

  return { derived, justNamed };
}
