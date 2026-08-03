/**
 * @vitest-environment jsdom
 *
 * Locks in the Career Curiosities selection rules:
 * - up to 5 picks (raised from 3 on user feedback, 2026-08-03)
 * - the 6th tap is ignored rather than silently replacing a pick
 * - reaching the cap is explained, not just visually dimmed
 * - "Don't know yet" stays mutually exclusive with real picks
 */
import React, { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import { CuriositiesPicker } from "@/components/character/curiosities-picker";

afterEach(() => {
  cleanup();
});

/** Wrapper holding real state, so toggling behaves like the character page. */
function Harness(): React.JSX.Element {
  const [value, setValue] = useState<string[]>([]);
  return (
    <>
      <CuriositiesPicker value={value} onChange={setValue} />
      <div data-testid="value">{value.join(",")}</div>
    </>
  );
}

const FIVE = [
  "Health & Medicine",
  "Technology & Engineering",
  "Creative Arts & Design",
  "Business & Finance",
  "Science & Research",
];

function pick(label: string): void {
  fireEvent.click(screen.getByRole("checkbox", { name: label }));
}

function selectedValue(): string {
  return screen.getByTestId("value").textContent ?? "";
}

describe("CuriositiesPicker", () => {
  it("advertises a cap of 5", () => {
    render(<Harness />);
    expect(
      screen.getByText(/Any areas that spark your interest\? Pick up to 5\./)
    ).toBeDefined();
  });

  it("allows five selections", () => {
    render(<Harness />);
    FIVE.forEach(pick);

    expect(selectedValue().split(",")).toHaveLength(5);
  });

  it("ignores a sixth selection instead of replacing a pick", () => {
    render(<Harness />);
    FIVE.forEach(pick);
    const atCap = selectedValue();

    pick("Law & Government");

    expect(selectedValue()).toBe(atCap);
    expect(selectedValue()).not.toContain("law_government");
  });

  it("counts down while picks remain", () => {
    render(<Harness />);
    pick("Health & Medicine");
    pick("Technology & Engineering");

    expect(screen.getByText(/\(3 remaining\)/)).toBeDefined();
  });

  it("explains the cap once it is reached", () => {
    render(<Harness />);
    FIVE.forEach(pick);

    expect(screen.getByText(/5 of 5 . tap one to swap/)).toBeDefined();
    expect(screen.queryByText(/remaining/)).toBeNull();
  });

  it("frees a slot when a pick is tapped again", () => {
    render(<Harness />);
    FIVE.forEach(pick);
    pick("Health & Medicine");

    expect(selectedValue().split(",")).toHaveLength(4);
    expect(screen.getByText(/\(1 remaining\)/)).toBeDefined();
  });

  it("marks unpicked chips disabled at the cap, and frees them after a swap", () => {
    render(<Harness />);
    FIVE.forEach(pick);

    const spare = screen.getByRole("checkbox", { name: "Law & Government" });
    expect(spare.getAttribute("aria-disabled")).toBe("true");

    pick("Health & Medicine");
    expect(spare.getAttribute("aria-disabled")).toBe("false");
  });

  it("keeps \"Don't know yet\" mutually exclusive with real picks", () => {
    render(<Harness />);
    pick("Health & Medicine");
    pick("Technology & Engineering");

    pick("Don't know yet");
    expect(selectedValue()).toBe("dont_know");

    pick("Creative Arts & Design");
    expect(selectedValue()).toBe("creative_arts");
  });
});
