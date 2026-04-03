/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SectionErrorBoundary } from "@/components/ui/section-error-boundary";

// Suppress React error boundary console.error noise in tests
const originalError = console.error;
beforeEach(() => {
  shouldThrow = true;
  console.error = vi.fn();
});
afterEach(() => {
  cleanup();
  console.error = originalError;
});

/** Component that throws on render when `shouldThrow` is true */
let shouldThrow = true;
function ThrowingChild(): React.JSX.Element {
  if (shouldThrow) {
    throw new Error("Test render error");
  }
  return <div>Recovered</div>;
}

describe("SectionErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <SectionErrorBoundary name="Charts">
        <div>OK</div>
      </SectionErrorBoundary>
    );
    expect(screen.getByText("OK")).toBeDefined();
  });

  it("shows fallback with section name when child throws", () => {
    render(
      <SectionErrorBoundary name="Charts">
        <ThrowingChild />
      </SectionErrorBoundary>
    );
    expect(screen.getByText("Something went wrong in Charts")).toBeDefined();
  });

  it("shows a Try again button in fallback", () => {
    render(
      <SectionErrorBoundary name="Score Cards">
        <ThrowingChild />
      </SectionErrorBoundary>
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeDefined();
  });

  it("re-renders children after clicking Try again when error is resolved", () => {
    shouldThrow = true;
    render(
      <SectionErrorBoundary name="Charts">
        <ThrowingChild />
      </SectionErrorBoundary>
    );

    // Verify fallback is shown
    expect(screen.getByText("Something went wrong in Charts")).toBeDefined();

    // Fix the error condition before retrying
    shouldThrow = false;

    // Click retry
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    // Children should now render successfully
    expect(screen.getByText("Recovered")).toBeDefined();
  });

  it("renders custom fallback when provided", () => {
    render(
      <SectionErrorBoundary name="Charts" fallback={<div>Custom error</div>}>
        <ThrowingChild />
      </SectionErrorBoundary>
    );
    expect(screen.getByText("Custom error")).toBeDefined();
  });
});
