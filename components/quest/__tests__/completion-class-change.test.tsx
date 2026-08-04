/** @vitest-environment jsdom */
/**
 * The confirmatory round answers interest items after the class was locked,
 * and the adaptive selector deliberately feeds the type closest to overtaking
 * the leader. So the last five questions can change which class the chart
 * reads as. The class saved has to follow the chart (see resolveFinalClass) --
 * but a student told "Guardian" at the reveal must not simply find
 * "Vanguard-Guardian" on the dashboard. This screen is where they are told.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import CompletionScreen from "@/components/quest/completion-screen";

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => cleanup());

const scoreState = {
  riasec: { R: 23.3, I: 46.7, A: 55, S: 90, E: 94.2, C: 41.7 },
  strengths: ["Empathy"],
};
const snapshot = { R: 23.3, I: 46.7, A: 55, S: 90, E: 88.3, C: 41.7 };

describe("CompletionScreen class change", () => {
  it("names the change when the last answers redrew the class", () => {
    render(
      <CompletionScreen
        tone="quest"
        classLabel="Vanguard-Guardian"
        previousClassLabel="Guardian-Vanguard"
        scoreState={scoreState}
        riasecSnapshot={snapshot}
        onViewDashboard={vi.fn()}
        onSaveExit={vi.fn()}
      />
    );

    expect(
      screen.getByText(/Guardian-Vanguard.*Vanguard-Guardian/)
    ).toBeDefined();
    // And never both "your class changed" and "your answers held firm".
    expect(screen.queryByText(/held firm/)).toBeNull();
  });

  it("says nothing about a change when the class held", () => {
    render(
      <CompletionScreen
        tone="quest"
        classLabel="Guardian-Vanguard"
        previousClassLabel="Guardian-Vanguard"
        scoreState={scoreState}
        riasecSnapshot={snapshot}
        onViewDashboard={vi.fn()}
        onSaveExit={vi.fn()}
      />
    );

    expect(screen.queryByText(/redrew your class/)).toBeNull();
  });

  it("uses plain wording in explorer tone", () => {
    render(
      <CompletionScreen
        tone="explorer"
        classLabel="Leader-Helper"
        previousClassLabel="Helper-Leader"
        scoreState={scoreState}
        riasecSnapshot={snapshot}
        onViewDashboard={vi.fn()}
        onSaveExit={vi.fn()}
      />
    );

    expect(
      screen.getByText(/changed your closest match: Helper-Leader → Leader-Helper/)
    ).toBeDefined();
  });
});
