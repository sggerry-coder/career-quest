"use client";

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
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="text-4xl" aria-hidden="true">{"\u{26A0}\u{FE0F}"}</span>

      <h1 className="text-xl font-semibold text-white">
        This device is signed in as {existingName}
      </h1>

      <p className="text-sm text-white/70 max-w-xs">
        Starting a new quest will <strong>delete {existingName}&apos;s answers and
        badges</strong>. They cannot be recovered.
      </p>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
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

      <p className="text-xs text-white/40 max-w-xs">
        Not {existingName}? This device is still signed in as them. Ask your teacher to sign
        you in on your own device.
      </p>
    </div>
  );
}
