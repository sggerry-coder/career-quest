"use client";

import { useEffect, useRef } from "react";

interface ReplaceProfileConfirmProps {
  existingName: string;
  tone: "quest" | "explorer";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Consent before destruction.
 *
 * provisionStudent reuses the browser's anonymous account, so on a shared
 * classroom device the second student tapping "start a new quest" used to
 * overwrite the first student's profile and delete their answers and badges,
 * silently and unrecoverably. That is the default classroom setup.
 */
export default function ReplaceProfileConfirm({
  existingName,
  tone,
  onConfirm,
  onCancel,
}: ReplaceProfileConfirmProps): React.JSX.Element {
  // The page swaps straight from a loading state into this screen with no
  // navigation the student initiated -- there is nothing for a keyboard or
  // screen-reader user to land on unless focus is moved here explicitly.
  // Land it on Cancel (the safe, primary action) rather than the
  // destructive one.
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="replace-profile-confirm-heading"
      aria-describedby="replace-profile-confirm-warning"
    >
      <span className="text-4xl" aria-hidden="true">{"\u{26A0}\u{FE0F}"}</span>

      <h1 id="replace-profile-confirm-heading" className="text-xl font-semibold text-white">
        This device is signed in as {existingName}
      </h1>

      {/*
        aria-label on the dialog would override this as its accessible
        name, which would silence the "cannot be recovered" sentence on
        open -- the one load-bearing fact a screen-reader user must hear
        before landing on the Cancel button. aria-labelledby +
        aria-describedby announce both.
      */}
      <p id="replace-profile-confirm-warning" className="text-sm text-white/70 max-w-xs">
        Starting a new quest will <strong>delete {existingName}&apos;s answers and
        badges</strong>. They cannot be recovered.
      </p>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          ref={cancelButtonRef}
          onClick={onCancel}
          className="rounded-xl bg-[var(--cq-primary,#8b5cf6)] px-8 py-3 font-semibold text-white shadow-[0_0_20px_var(--cq-glow,rgba(139,92,246,0.3))] min-h-[44px]"
        >
          Keep {existingName}&apos;s quest
        </button>
        <button
          onClick={onConfirm}
          className="rounded-xl border border-white/20 px-8 py-3 font-medium text-white/60 min-h-[44px]"
        >
          {tone === "quest" ? "Delete it and start over" : "Delete and start again"}
        </button>
      </div>

      {/*
        text-white/70, not the /40 this line first shipped with: on a dark
        background /40 measures ~3.8:1, short of the 4.5:1 body-text
        minimum. This is the line that tells the *wrong* student (the one
        this whole screen exists to protect) what to do instead, so it
        cannot be the faintest text on the screen.
      */}
      <p className="text-xs text-white/70 max-w-xs">
        Not {existingName}? This device is still signed in as them. Ask your teacher to sign
        you in on your own device.
      </p>
    </div>
  );
}
