/**
 * @vitest-environment jsdom
 *
 * Locks in the single-control spectrum slider (P2.4):
 * - exactly ONE radiogroup with 7 labelled radio segments, nothing else
 * - click commits once; arrow keys move focus WITHOUT committing
 * - Enter/Space commits the focused position exactly once
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import SpectrumSlider from "@/components/quest/spectrum-slider";

afterEach(() => {
  cleanup();
});

function renderSlider(value: number | null = null) {
  const onChange = vi.fn();
  render(
    <SpectrumSlider
      value={value}
      onChange={onChange}
      leftLabel="I like clear plans"
      rightLabel="I like open options"
    />
  );
  return { onChange };
}

describe("SpectrumSlider", () => {
  it("renders exactly one radiogroup with 7 radios and no stray buttons", () => {
    renderSlider();

    const groups = screen.getAllByRole("radiogroup");
    expect(groups).toHaveLength(1);
    expect(groups[0].getAttribute("aria-label")).toBe(
      "I like clear plans to I like open options"
    );

    expect(screen.getAllByRole("radio")).toHaveLength(7);
    // The old fallback row / track button surfaces must be gone
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("labels every position with its pole and strength", () => {
    renderSlider();

    expect(
      screen.getByRole("radio", { name: "I like clear plans — strongly" })
    ).toBeDefined();
    expect(
      screen.getByRole("radio", { name: "I like clear plans — slightly" })
    ).toBeDefined();
    expect(screen.getByRole("radio", { name: "Neutral" })).toBeDefined();
    expect(
      screen.getByRole("radio", { name: "I like open options — moderately" })
    ).toBeDefined();
  });

  it("commits exactly once on click", () => {
    const { onChange } = renderSlider();

    fireEvent.click(
      screen.getByRole("radio", { name: "I like open options — strongly" })
    );

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("arrow keys move focus without committing", () => {
    const { onChange } = renderSlider();

    const neutral = screen.getByRole("radio", { name: "Neutral" });
    neutral.focus();
    fireEvent.keyDown(neutral, { key: "ArrowRight" });

    const slightRight = screen.getByRole("radio", {
      name: "I like open options — slightly",
    });
    expect(document.activeElement).toBe(slightRight);
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyDown(slightRight, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(neutral);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Home and End jump to the poles without committing", () => {
    const { onChange } = renderSlider();

    const neutral = screen.getByRole("radio", { name: "Neutral" });
    neutral.focus();
    fireEvent.keyDown(neutral, { key: "End" });
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: "I like open options — strongly" })
    );

    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: "I like clear plans — strongly" })
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Enter commits the focused position exactly once", () => {
    const { onChange } = renderSlider();

    const neutral = screen.getByRole("radio", { name: "Neutral" });
    neutral.focus();
    fireEvent.keyDown(neutral, { key: "ArrowRight" });
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    fireEvent.keyDown(document.activeElement!, { key: "Enter" });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("Space commits the focused position", () => {
    const { onChange } = renderSlider();

    const neutral = screen.getByRole("radio", { name: "Neutral" });
    neutral.focus();
    fireEvent.keyDown(neutral, { key: " " });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("focus cannot move past the poles", () => {
    const { onChange } = renderSlider();

    const neutral = screen.getByRole("radio", { name: "Neutral" });
    neutral.focus();
    fireEvent.keyDown(neutral, { key: "Home" });

    const leftPole = screen.getByRole("radio", {
      name: "I like clear plans — strongly",
    });
    expect(document.activeElement).toBe(leftPole);
    fireEvent.keyDown(leftPole, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(leftPole);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("reflects a committed value via aria-checked", () => {
    renderSlider(2);

    const committed = screen.getByRole("radio", {
      name: "I like open options — moderately",
    });
    expect(committed.getAttribute("aria-checked")).toBe("true");
    const others = screen
      .getAllByRole("radio")
      .filter((r) => r !== committed);
    for (const radio of others) {
      expect(radio.getAttribute("aria-checked")).toBe("false");
    }
  });
});
