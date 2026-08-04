/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ReplaceProfileConfirm from "@/components/quest/replace-profile-confirm";

afterEach(() => cleanup());

describe("ReplaceProfileConfirm", () => {
  it("names whose work is about to be deleted", () => {
    const { container } = render(
      <ReplaceProfileConfirm existingName="Priya" tone="quest" onConfirm={() => {}} onCancel={() => {}} />
    );
    // A second student on a classroom laptop must recognise this is not theirs.
    // The name is deliberately repeated (heading, keep-button, footnote), so
    // assert on the set rather than a single match.
    expect(screen.getAllByText(/Priya/).length).toBeGreaterThan(0);

    // Scoped to the warning paragraph specifically, not "any element on the
    // page" -- the regex also matches the "Delete it and start over" button
    // label, so a looser assertion would still pass if the warning sentence
    // itself were deleted.
    const warningParagraph = container.querySelectorAll("p")[0];
    expect(warningParagraph.textContent).toMatch(/delet(e|ed)|erased|lost/i);
  });

  it("makes cancelling the easy path", () => {
    const onCancel = vi.fn();
    render(<ReplaceProfileConfirm existingName="Priya" tone="quest" onConfirm={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: /keep|cancel|back/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("only destroys on an explicit confirmation", () => {
    const onConfirm = vi.fn();
    render(<ReplaceProfileConfirm existingName="Priya" tone="quest" onConfirm={onConfirm} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /delete|start over|replace/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("is announced as an alert dialog and moves focus to the safe action", () => {
    render(<ReplaceProfileConfirm existingName="Priya" tone="quest" onConfirm={() => {}} onCancel={() => {}} />);
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeDefined();

    const cancelButton = screen.getByRole("button", { name: /keep/i });
    expect(document.activeElement).toBe(cancelButton);
  });

  it("uses the student's own tone for the destructive button's wording", () => {
    render(
      <ReplaceProfileConfirm existingName="Priya" tone="explorer" onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(screen.getByText(/Delete and start again/i)).toBeDefined();
  });
});
