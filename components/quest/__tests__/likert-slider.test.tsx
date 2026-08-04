/**
 * @vitest-environment jsdom
 *
 * The rating scale had the radiogroup roles and none of the behaviour: four
 * tab stops and no arrow keys. These are the WAI-ARIA radiogroup rules, and
 * they are deliberately the same assertions as
 * components/quest/__tests__/spectrum-slider.test.tsx — the two controls have
 * to answer to the same keys.
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import LikertSlider from "@/components/quest/likert-slider";

afterEach(() => {
  cleanup();
});

function renderSlider(value: number | null = null) {
  const onChange = vi.fn();
  render(<LikertSlider value={value} onChange={onChange} />);
  return { onChange };
}

describe("LikertSlider", () => {
  it("renders one radiogroup of four radios", () => {
    renderSlider();

    expect(screen.getAllByRole("radiogroup")).toHaveLength(1);
    expect(screen.getAllByRole("radio")).toHaveLength(4);
  });

  it("names each point with the digit the student can see and its wording", () => {
    renderSlider();

    // WCAG 2.5.3: the aria-label used to be "Strongly Dislike" over a
    // visible "1", so speaking the visible label selected nothing.
    expect(
      screen.getByRole("radio", { name: "1 — Strongly Dislike" })
    ).toBeDefined();
    expect(screen.getByRole("radio", { name: "4 — Strongly Like" })).toBeDefined();
  });

  it("is a single tab stop", () => {
    renderSlider();

    const tabbable = screen
      .getAllByRole("radio")
      .filter((r) => r.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0].getAttribute("aria-label")).toBe("1 — Strongly Dislike");
  });

  it("puts the tab stop on the committed answer, not the first point", () => {
    renderSlider(3);

    const tabbable = screen
      .getAllByRole("radio")
      .filter((r) => r.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0].getAttribute("aria-label")).toBe("3 — Like");
  });

  it("arrow keys move focus without committing", () => {
    const { onChange } = renderSlider();

    const first = screen.getByRole("radio", { name: "1 — Strongly Dislike" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });

    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: "2 — Dislike" })
    );
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(first);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Home and End jump to the ends of the scale", () => {
    const { onChange } = renderSlider();

    const first = screen.getByRole("radio", { name: "1 — Strongly Dislike" });
    first.focus();
    fireEvent.keyDown(first, { key: "End" });
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: "4 — Strongly Like" })
    );

    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(document.activeElement).toBe(first);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("focus cannot move past either end", () => {
    const { onChange } = renderSlider();

    const first = screen.getByRole("radio", { name: "1 — Strongly Dislike" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(first, { key: "End" });
    const last = screen.getByRole("radio", { name: "4 — Strongly Like" });
    fireEvent.keyDown(last, { key: "ArrowRight" });
    expect(document.activeElement).toBe(last);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Enter commits the focused point exactly once", () => {
    const { onChange } = renderSlider();

    const first = screen.getByRole("radio", { name: "1 — Strongly Dislike" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    fireEvent.keyDown(document.activeElement!, { key: "Enter" });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("Space commits the focused point exactly once", () => {
    const { onChange } = renderSlider();

    const first = screen.getByRole("radio", { name: "1 — Strongly Dislike" });
    first.focus();
    fireEvent.keyDown(first, { key: " " });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("commits exactly once on click", () => {
    const { onChange } = renderSlider();

    fireEvent.click(screen.getByRole("radio", { name: "4 — Strongly Like" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("reflects the committed answer via aria-checked", () => {
    renderSlider(2);

    const committed = screen.getByRole("radio", { name: "2 — Dislike" });
    expect(committed.getAttribute("aria-checked")).toBe("true");
    for (const radio of screen.getAllByRole("radio").filter((r) => r !== committed)) {
      expect(radio.getAttribute("aria-checked")).toBe("false");
    }
  });
});
