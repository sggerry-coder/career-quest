/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ClassNamedScreen from "@/components/quest/class-named-screen";

afterEach(() => cleanup());

const guardian = { primary: "guardian" as const, secondary: null, isNamed: true };

describe("ClassNamedScreen", () => {
  it("names the class and gives it its meaning", () => {
    render(<ClassNamedScreen derived={guardian} tone="quest" onContinue={() => {}} />);
    expect(screen.getByText(/You are a Guardian/)).toBeDefined();
    // The tagline written in lib/theme.ts, which nothing rendered before.
    expect(screen.getByText(/You stand where someone else would have fallen/)).toBeDefined();
  });

  it("uses the plain name in explorer tone", () => {
    render(<ClassNamedScreen derived={guardian} tone="explorer" onContinue={() => {}} />);
    expect(screen.getByText(/Helper/)).toBeDefined();
    expect(screen.queryByText(/Guardian/)).toBeNull();
  });

  it("continues the quest", () => {
    const onContinue = vi.fn();
    render(<ClassNamedScreen derived={guardian} tone="quest" onContinue={onContinue} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
