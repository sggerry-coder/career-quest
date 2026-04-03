"use client";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}): React.JSX.Element {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <div className="max-w-sm rounded-2xl bg-white/5 border border-white/10 p-8">
        <span className="text-4xl mb-4 block">{"\u{1F635}\u{200D}\u{1F4AB}"}</span>
        <h2 className="text-xl font-semibold text-white mb-2">
          Oops! Something went wrong
        </h2>
        <p className="text-sm text-white/50 mb-6">
          {error.message || "We hit a snag loading your quest session."}
        </p>
        <button
          onClick={() => unstable_retry()}
          className="rounded-xl bg-[var(--cq-primary,#8b5cf6)] px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
