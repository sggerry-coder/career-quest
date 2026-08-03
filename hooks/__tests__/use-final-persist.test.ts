/**
 * @vitest-environment jsdom
 *
 * The completion screen is gated on this machine, so its states have to be
 * exact. Before it existed the page tracked `PersistResult | null`, where null
 * meant both "not started" and "in flight" — there was no state meaning
 * *saving*, so the celebration rendered regardless of what the save did.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";

import { useFinalPersist } from "@/hooks/use-final-persist";
import type { PersistResult } from "@/lib/validation/error-classification";

afterEach(() => {
  cleanup();
});

function deferred(): {
  promise: Promise<PersistResult>;
  resolve: (r: PersistResult) => void;
} {
  let resolve!: (r: PersistResult) => void;
  const promise = new Promise<PersistResult>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("useFinalPersist", () => {
  it("starts idle", () => {
    const { result } = renderHook(() =>
      useFinalPersist(() => Promise.resolve({ success: true }))
    );

    expect(result.current.status).toBe("idle");
    expect(result.current.errorType).toBeNull();
  });

  it("goes idle → saving → saved", async () => {
    const d = deferred();
    const { result } = renderHook(() => useFinalPersist(() => d.promise));

    act(() => result.current.start());
    expect(result.current.status).toBe("saving");

    await act(async () => {
      d.resolve({ success: true });
      await d.promise;
    });
    expect(result.current.status).toBe("saved");
    expect(result.current.errorType).toBeNull();
  });

  it("goes idle → saving → failed, keeping the reason", async () => {
    const { result } = renderHook(() =>
      useFinalPersist(() =>
        Promise.resolve({
          success: false,
          errorType: "auth" as const,
          message: "No authenticated user",
        })
      )
    );

    act(() => result.current.start());
    await waitFor(() => expect(result.current.status).toBe("failed"));

    expect(result.current.errorType).toBe("auth");
    expect(result.current.errorMessage).toBe("No authenticated user");
  });

  it("treats a thrown error as an unknown failure rather than hanging", async () => {
    const { result } = renderHook(() =>
      useFinalPersist(() => Promise.reject(new Error("boom")))
    );

    act(() => result.current.start());
    await waitFor(() => expect(result.current.status).toBe("failed"));
    expect(result.current.errorType).toBe("unknown");
  });

  it("runs the save exactly once however often start is called", async () => {
    const run = vi.fn(() => Promise.resolve({ success: true }));
    const { result } = renderHook(() => useFinalPersist(run));

    act(() => result.current.start());
    act(() => result.current.start());
    act(() => result.current.start());

    await waitFor(() => expect(result.current.status).toBe("saved"));
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("recovers from failed to saved on retry, clearing the old error", async () => {
    let attempt = 0;
    const run = vi.fn(() => {
      attempt += 1;
      return Promise.resolve(
        attempt === 1
          ? { success: false, errorType: "network" as const, message: "offline" }
          : { success: true }
      );
    });
    const { result } = renderHook(() => useFinalPersist(run));

    act(() => result.current.start());
    await waitFor(() => expect(result.current.status).toBe("failed"));

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe("saved"));

    expect(run).toHaveBeenCalledTimes(2);
    expect(result.current.errorType).toBeNull();
    expect(result.current.errorMessage).toBeNull();
  });

  it("allows repeated retries, unlike start", async () => {
    const run = vi.fn(() =>
      Promise.resolve({ success: false, errorType: "network" as const })
    );
    const { result } = renderHook(() => useFinalPersist(run));

    act(() => result.current.start());
    await waitFor(() => expect(result.current.status).toBe("failed"));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe("failed"));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe("failed"));

    expect(run).toHaveBeenCalledTimes(3);
  });
});
