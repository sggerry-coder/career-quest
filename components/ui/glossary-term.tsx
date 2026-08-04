"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GLOSSARY, type GlossaryTermId } from "@/data/glossary";

/**
 * Tap a word on the dashboard, read what it means.
 *
 * Two triggers, one popup:
 *   - {@link GlossaryTerm} turns a word already on the screen into the button
 *     (a chart row label, a chip, a pill).
 *   - {@link GlossaryHint} is the small "?" for a section heading, where the
 *     heading itself has to stay a plain heading.
 *
 * Both open the same dialog, so a student learns one gesture and it works
 * everywhere.
 *
 * The popup goes through a portal to document.body rather than rendering where
 * it is declared. Two reasons, and the first one is a bug rather than a
 * preference: `position: fixed` is measured against the nearest transformed
 * ancestor, not the viewport, and several of the surfaces this sits inside are
 * Framer `motion` elements that animate `y` -- EmergingType's wrapper, the
 * relic shelf's list items, the self-map chips. Declared in place, the popup
 * would land relative to a chart row. The second reason is the charts: at
 * document.body the open dialog is not in the chart's subtree at all, so it
 * cannot shift a bar, a track, or the alignment of the "Not asked" column.
 */

/**
 * Grows the tap target vertically without moving anything.
 *
 * The chart row labels this wraps are 16px of text in rows pitched 24-36px
 * apart, so a 44px target is not available without re-laying-out four charts
 * that were fixed for a different bug yesterday. Padding plus the matching
 * negative margin gets the target to 24px -- the WCAG 2.5.8 minimum -- while
 * leaving the label's outer box exactly the size it was, so no row moves and
 * no two targets overlap. Horizontal padding is left to the call site: these
 * labels sit in fixed-width columns (`w-20`, `w-28`) where a negative
 * horizontal margin would pull the whole row 12px sideways.
 */
const HIT_AREA = "py-1 -my-1";

/**
 * The affordance. A dotted underline is the long-standing "there is a
 * definition here" convention and, unlike an added icon, it costs no width --
 * which matters where the label is already truncating inside `w-28`.
 */
const AFFORDANCE =
  "underline decoration-dotted decoration-white/60 underline-offset-4";

/** Shared open/close state, including the focus return that Escape needs. */
function useTermPopup() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((): void => {
    setOpen(false);
    // Escape, "Got it" and the backdrop all land the student back on the word
    // they tapped. Without this, focus falls to <body> when the dialog
    // unmounts and the next Tab restarts at the top of the page -- the same
    // failure hooks/use-screen-change.ts exists to prevent between screens.
    triggerRef.current?.focus();
  }, []);

  return { open, setOpen, close, triggerRef };
}

interface TermPopupProps {
  heading: string;
  body: string;
  onClose: () => void;
}

function TermPopup({ heading, body, onClose }: TermPopupProps): React.ReactPortal {
  const headingId = useId();
  const bodyId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Nothing the student did moved focus here -- they pressed a button that
  // stayed put and a dialog appeared elsewhere in the document. Moving focus
  // is what announces it, exactly as in components/quest/replace-profile-confirm.
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return createPortal(
    // Bottom-anchored on a phone, centred once there is room: this is read
    // one-handed on a 5" screen far more often than on a laptop.
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      {/*
        A button, not a div with an onClick: it keeps the backdrop out of the
        tab order deliberately rather than by omission, and it needs no
        keyboard equivalent because Escape already closes. aria-hidden because
        aria-modal already hides everything outside the dialog, and a
        second unlabelled "close" control would only add noise.
      */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-black/70"
      />

      <div
        role="dialog"
        aria-modal="true"
        // labelledby + describedby, not aria-label: the definition is the
        // whole point of opening this, and an aria-label on the dialog would
        // override the heading and leave the body unannounced on open. Same
        // reasoning as replace-profile-confirm.
        aria-labelledby={headingId}
        aria-describedby={bodyId}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            // Stop here. The dashboard does not listen for Escape today, but
            // a popup swallowing its own dismissal key is the contract.
            e.stopPropagation();
            onClose();
          } else if (e.key === "Tab") {
            // "Got it" is the only focusable thing in here, so the trap is
            // just "stay". Without it, Tab walks out of an aria-modal dialog
            // into content a screen reader has been told is not there.
            e.preventDefault();
            closeRef.current?.focus();
          }
        }}
        // Opaque, not a tint: a translucent card would make the body text's
        // contrast depend on whichever chart happened to be behind it. On
        // #1a1035 (the app background's own lower stop) white/85 body text
        // measures 13.07:1 and the white heading 17.95:1.
        //
        // The border is /40, not the /20 this first had. The card is almost
        // exactly as dark as the dimmed page behind it -- 1.13:1 -- so the
        // border is the only thing that says where the popup ends, and at /20
        // it measured 2.08:1 against that backdrop, under the 3:1 floor for
        // meaningful non-text. /40 is 4.25:1. See
        // lib/__tests__/glossary-contrast.test.ts.
        className="relative w-full max-w-sm rounded-2xl border border-white/40 bg-[#1a1035] p-5 shadow-2xl"
      >
        <h2 id={headingId} className="text-base font-semibold text-white">
          {heading}
        </h2>
        <p id={bodyId} className="mt-2 text-sm leading-relaxed text-white/85">
          {body}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="mt-4 min-h-[44px] w-full rounded-xl border border-white/25 px-4 py-2.5 text-sm font-medium text-white"
        >
          Got it
        </button>
      </div>
    </div>,
    document.body
  );
}

interface GlossaryTermProps {
  term: GlossaryTermId;
  /**
   * Popup heading, where the on-screen wording is not the glossary's own
   * title. The relic shelf's heading changes with the student's tone
   * ("Relics" / "What you showed") and the popup should be headed by the words
   * they actually tapped -- the definition underneath stays the same one.
   */
  label?: string;
  /**
   * Set false where the trigger already carries its own padding -- a chip or a
   * pill. {@link HIT_AREA} and a call site's own `py-*` are the same Tailwind
   * property, and which of two conflicting utilities wins is decided by the
   * order they appear in the stylesheet, not in the class attribute. Turning
   * it off is the only way to be sure the chip keeps the padding it asked for.
   */
  hitArea?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** A word on the screen that opens its own definition. */
export function GlossaryTerm({
  term,
  label,
  hitArea = true,
  className = "",
  children,
}: GlossaryTermProps): React.JSX.Element {
  const entry = GLOSSARY[term];
  const { open, setOpen, close, triggerRef } = useTermPopup();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        // Read by the coverage test, which sweeps the rendered dashboard and
        // fails if a term reaches the screen without a definition behind it.
        data-cq-term={term}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={`${hitArea ? HIT_AREA : ""} ${AFFORDANCE} ${className}`}
      >
        {children}
      </button>
      {open && (
        <TermPopup
          heading={label ?? entry.title}
          body={entry.body}
          onClose={close}
        />
      )}
    </>
  );
}

interface GlossaryHintProps {
  term: GlossaryTermId;
  /** See {@link GlossaryTermProps.label}. */
  label?: string;
  className?: string;
}

/**
 * The "?" beside a section heading.
 *
 * Separate from GlossaryTerm because a heading has to stay a heading: wrapping
 * "Ability Scores" in a button empties the heading's own text, and wrapping
 * heading and button together in a flex row changes what the heading's parent
 * element is -- which is how two existing tests find the card. This sits
 * inside the heading and stays out of its way; every call site restates the
 * heading's accessible name so this button's label is not folded into it.
 *
 * The target is expanded with an absolutely positioned pseudo-element rather
 * than padding, because unlike the row labels there is no fixed-width column
 * to disturb here: 20px of visible circle, 44px of tappable area, and no
 * effect on the heading's layout at all.
 */
export function GlossaryHint({
  term,
  label,
  className = "",
}: GlossaryHintProps): React.JSX.Element {
  const entry = GLOSSARY[term];
  const heading = label ?? entry.title;
  const { open, setOpen, close, triggerRef } = useTermPopup();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-cq-term={term}
        aria-haspopup="dialog"
        aria-expanded={open}
        // "What Relics means", not "?" -- and not "more info" either, which
        // tells a screen-reader user nothing about which of the seven of
        // these on the page they have landed on.
        aria-label={`What ${heading} means`}
        onClick={() => setOpen(true)}
        className={`relative inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/40 align-middle text-[11px] font-bold leading-none text-white/70 normal-case tracking-normal before:absolute before:-inset-3 before:content-[''] ${className}`}
      >
        ?
      </button>
      {open && (
        <TermPopup heading={heading} body={entry.body} onClose={close} />
      )}
    </>
  );
}
