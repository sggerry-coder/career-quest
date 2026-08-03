/**
 * @vitest-environment jsdom
 *
 * This screen replaces the celebration when the final save fails. Its job is
 * to be impossible to mistake for success, and to never offer a route to a
 * dashboard that has nothing in it.
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import SaveFailedScreen from "@/components/quest/save-failed-screen";

afterEach(() => {
  cleanup();
});

const noop = (): void => {};

describe("SaveFailedScreen", () => {
  it("offers a retry for a connection problem", () => {
    render(
      <SaveFailedScreen
        errorType="network"
        onRetry={noop}
        onSignIn={noop}
        onLeave={noop}
      />
    );

    expect(screen.getByRole("button", { name: "Try saving again" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Sign in again" })).toBeNull();
  });

  it("offers sign-in instead of retry when the session died", () => {
    render(
      <SaveFailedScreen
        errorType="auth"
        onRetry={noop}
        onSignIn={noop}
        onLeave={noop}
      />
    );

    // Retrying a dead session cannot succeed, so it must not be offered.
    expect(screen.getByRole("button", { name: "Sign in again" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Try saving again" })).toBeNull();
  });

  it("never offers the dashboard, which reads the data that failed to save", () => {
    render(
      <SaveFailedScreen
        errorType="unknown"
        onRetry={noop}
        onSignIn={noop}
        onLeave={noop}
      />
    );

    expect(screen.queryByRole("button", { name: "View Dashboard" })).toBeNull();
    expect(screen.getByRole("button", { name: "Leave for now" })).toBeDefined();
  });

  it("promises the answers survived, in every error case", () => {
    for (const errorType of ["network", "auth", "unknown"] as const) {
      render(
        <SaveFailedScreen
          errorType={errorType}
          onRetry={noop}
          onSignIn={noop}
          onLeave={noop}
        />
      );
      expect(screen.getByText(/answers are safe on this device/)).toBeDefined();
      cleanup();
    }
  });

  it("shows the real error text so a cause isn't hidden behind 'check your connection'", () => {
    render(
      <SaveFailedScreen
        errorType="unknown"
        detail="column students.has_completed_session1 does not exist"
        onRetry={noop}
        onSignIn={noop}
        onLeave={noop}
      />
    );

    expect(
      screen.getByText("column students.has_completed_session1 does not exist")
    ).toBeDefined();
  });

  it("wires the buttons to their handlers", () => {
    const onRetry = vi.fn();
    const onLeave = vi.fn();
    render(
      <SaveFailedScreen
        errorType="network"
        onRetry={onRetry}
        onSignIn={noop}
        onLeave={onLeave}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Try saving again" }));
    fireEvent.click(screen.getByRole("button", { name: "Leave for now" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});
