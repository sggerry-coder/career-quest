"use client";

import { useCallback, useRef } from "react";

/**
 * Put the student on the screen that just replaced the one they were on.
 *
 * Chapter 1 is a single React tree that swaps its whole contents — question,
 * interstitial, naming moment, reveal beat, celebration, failure — without ever
 * unmounting the page shell. Nothing moved focus at any of those swaps, so a
 * keyboard student's focus fell back to <body> the moment the control they were
 * on disappeared (the next Tab restarts at the top of the document), and a
 * screen reader was told nothing at all: the answer was recorded and the app
 * went silent.
 *
 * The fix is focus, not a live region. Moving focus to the new view's heading
 * *is* the announcement — a screen reader reads the focused element's name and
 * role, so the student hears "Chapter 1 Complete, heading level 1" — and it is
 * the only one of the two that also fixes the keyboard user. The WAI-ARIA
 * Authoring Practices are explicit that doing both to the same content makes
 * assistive technology say it twice.
 *
 * A callback ref, not an effect on a ref object, because half these swaps go
 * through AnimatePresence `mode="wait"`: the new heading is not in the DOM when
 * the prop changes, it arrives when the outgoing screen has finished leaving.
 * An effect would run against the screen the student is being moved *off*.
 *
 * @param screenName A string that changes exactly when the view changes. It is
 *   a trigger, not the announcement — what gets read is the target element's
 *   own accessible name, so the two can never contradict each other.
 * @returns A ref to attach to the new view's heading, or, where a view has no
 *   heading, to the labelled element that stands for it.
 */
export function useScreenChange<T extends HTMLElement = HTMLElement>(
  screenName: string
): (node: T | null) => void {
  // The screen we last moved to. Guards against re-focusing when a screen
  // re-renders for an unrelated reason and React reattaches the ref.
  const focusedScreen = useRef<string | null>(null);

  return useCallback(
    (node: T | null): void => {
      if (!node || focusedScreen.current === screenName) return;
      focusedScreen.current = screenName;

      // A heading is not focusable. Setting tabindex here rather than at each
      // call site is the point of having a primitive: forgetting it makes
      // focus() silently do nothing, which is indistinguishable from the bug.
      if (!node.hasAttribute("tabindex")) {
        node.setAttribute("tabindex", "-1");
      }
      node.focus();
    },
    [screenName]
  );
}
