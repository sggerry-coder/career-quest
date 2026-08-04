/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ReplaceProfileConfirm from "@/components/quest/replace-profile-confirm";

afterEach(() => cleanup());

describe("ReplaceProfileConfirm", () => {
  it("names whose work is about to be deleted", () => {
    render(<ReplaceProfileConfirm existingName="Priya" tone="quest" onConfirm={() => {}} onCancel={() => {}} />);
    // A second student on a classroom laptop must recognise this is not theirs.
    // The name is deliberately repeated (heading, keep-button, footnote), so
    // assert on the set rather than a single match.
    expect(screen.getAllByText(/Priya/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/delet(e|ed)|erased|lost/i).length).toBeGreaterThan(0);
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
});
