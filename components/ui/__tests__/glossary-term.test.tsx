/**
 * @vitest-environment jsdom
 *
 * The dashboard has around forty of these on it, so every one of them has to
 * work by keyboard alone and hand focus back where it came from. A student
 * using a keyboard who opens six definitions and is returned to <body> six
 * times has to tab from the top of the page each time -- the same failure
 * hooks/use-screen-change.ts was written to stop happening between screens.
 *
 * Keyboard behaviour is exercised as behaviour: real key events on the real
 * focused element, then an assertion about where focus actually is. Asserting
 * that an `onKeyDown` prop or an `aria-*` attribute exists proves nothing
 * about whether pressing the key does anything.
 */
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import { GlossaryTerm, GlossaryHint } from "@/components/ui/glossary-term";
import { GLOSSARY } from "@/data/glossary";

afterEach(() => cleanup());

/** The trigger, found the way a student finds it: by the word on the screen. */
function trigger(name: RegExp | string): HTMLElement {
  return screen.getByRole("button", { name });
}

describe("opening a definition", () => {
  it("says what the word means, not what the student scored", () => {
    render(
      <GlossaryTerm term="values-prestige-fulfilment">Prestige</GlossaryTerm>
    );
    fireEvent.click(trigger("Prestige"));

    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain(
      GLOSSARY["values-prestige-fulfilment"].body
    );
    expect(dialog.textContent).toContain("Prestige or Fulfilment");
  });

  it("heads the popup with both ends of a line, whichever end was tapped", () => {
    // Tapping "Fulfilment" must not open something headed "Fulfilment": a
    // one-ended heading reads as a verdict before the body has said anything.
    render(
      <GlossaryTerm term="values-prestige-fulfilment">Fulfilment</GlossaryTerm>
    );
    fireEvent.click(trigger("Fulfilment"));

    expect(
      screen.getByRole("dialog", { name: "Prestige or Fulfilment" })
    ).toBeDefined();
  });

  it("takes its heading from the words on the screen when asked to", () => {
    // The relic shelf's heading changes with the student's tone, and the popup
    // should not introduce a word ("Relics") that is not on their screen.
    render(<GlossaryHint term="relics" label="What you showed" />);
    fireEvent.click(trigger(/What you showed/));

    const dialog = screen.getByRole("dialog", { name: "What you showed" });
    // Same single definition underneath, not a tone-specific variant.
    expect(dialog.textContent).toContain(GLOSSARY.relics.body);
  });

  it("announces the definition as well as the heading", () => {
    // aria-labelledby names it, aria-describedby reads the definition out on
    // open. An aria-label on the dialog would silence the second, which is the
    // only thing in here worth hearing -- see quest/replace-profile-confirm.
    render(<GlossaryTerm term="still-emerging">Still Emerging</GlossaryTerm>);
    fireEvent.click(trigger("Still Emerging"));

    const dialog = screen.getByRole("dialog", { name: "Still Emerging" });
    const describedBy = dialog.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent).toBe(
      GLOSSARY["still-emerging"].body
    );
    expect(dialog.hasAttribute("aria-label")).toBe(false);
  });

  it("shows nothing at all until it is asked", () => {
    render(<GlossaryTerm term="interest-maker">Maker</GlossaryTerm>);
    expect(screen.queryByRole("dialog")).toBeNull();
    // The chart around it must be unchanged while closed -- no hidden panel
    // sitting in the row waiting to be revealed.
    expect(document.body.textContent).toBe("Maker");
  });
});

describe("keyboard and focus", () => {
  it("is reachable by keyboard", () => {
    render(<GlossaryTerm term="interest-maker">Maker</GlossaryTerm>);
    const button = trigger("Maker");
    button.focus();
    expect(document.activeElement).toBe(button);
  });

  it("moves focus into the popup when it opens", () => {
    // The popup appears somewhere else in the document (it is portalled to
    // body). Without this a keyboard student's focus is still on a trigger
    // behind an aria-modal dialog, and a screen reader has been told nothing.
    render(<GlossaryTerm term="interest-maker">Maker</GlossaryTerm>);
    fireEvent.click(trigger("Maker"));

    expect(document.activeElement).toBe(trigger(/Got it/));
  });

  it("closes on Escape and puts focus back on the word", () => {
    render(<GlossaryTerm term="interest-maker">Maker</GlossaryTerm>);
    const button = trigger("Maker");
    fireEvent.click(button);

    fireEvent.keyDown(document.activeElement!, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it("closes on the dismiss button and puts focus back on the word", () => {
    render(<GlossaryTerm term="interest-maker">Maker</GlossaryTerm>);
    const button = trigger("Maker");
    fireEvent.click(button);
    fireEvent.click(trigger(/Got it/));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it("does not let Tab walk out of an open popup", () => {
    // aria-modal has told a screen reader the rest of the page is not there.
    // Tab leaving anyway puts a keyboard student somewhere their screen reader
    // says does not exist.
    render(
      <>
        <GlossaryTerm term="interest-maker">Maker</GlossaryTerm>
        <button type="button">Somewhere else</button>
      </>
    );
    fireEvent.click(trigger("Maker"));
    const dismiss = trigger(/Got it/);

    // jsdom does not move focus on Tab at all, so "focus did not move" would
    // pass with no trap in the component whatsoever -- it did, until this test
    // was rewritten. What actually stops a real browser is preventDefault, and
    // fireEvent returns false exactly when a handler called it.
    expect(fireEvent.keyDown(dismiss, { key: "Tab" })).toBe(false);
    expect(fireEvent.keyDown(dismiss, { key: "Tab", shiftKey: true })).toBe(false);
    // The assertion has teeth: an ordinary key is left alone.
    expect(fireEvent.keyDown(dismiss, { key: "a" })).toBe(true);

    // And the handler actively puts focus back, so a browser that had already
    // begun moving it lands inside the dialog again rather than behind it.
    screen.getByRole("button", { name: "Somewhere else" }).focus();
    fireEvent.keyDown(dismiss, { key: "Tab" });
    expect(document.activeElement).toBe(dismiss);
  });

  it("keeps Escape from escaping to the page behind it", () => {
    // A popup that lets its own dismissal key through would close itself and
    // whatever else is listening. Nothing on the dashboard listens today; the
    // contract is what stops that from mattering later.
    const seen: string[] = [];
    render(
      <div onKeyDown={(e) => seen.push(e.key)}>
        <GlossaryTerm term="interest-maker">Maker</GlossaryTerm>
      </div>
    );
    fireEvent.click(trigger("Maker"));
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });

    expect(seen).toEqual([]);
  });

  it("reports whether it is open, so a screen reader can say so", () => {
    render(<GlossaryTerm term="interest-maker">Maker</GlossaryTerm>);
    expect(trigger("Maker").getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(trigger("Maker"));
    expect(trigger("Maker").getAttribute("aria-expanded")).toBe("true");
  });
});

describe("dismissing by tapping away", () => {
  it("closes when the backdrop is tapped, and returns focus", () => {
    const { baseElement } = render(
      <GlossaryTerm term="interest-maker">Maker</GlossaryTerm>
    );
    const button = trigger("Maker");
    fireEvent.click(button);

    // The backdrop is deliberately hidden from assistive technology (the
    // dialog is aria-modal), so it is found by its role in the DOM rather
    // than by an accessible name.
    const backdrop = baseElement.querySelector<HTMLElement>(
      'button[aria-hidden="true"]'
    );
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it("keeps the backdrop out of the tab order", () => {
    const { baseElement } = render(
      <GlossaryTerm term="interest-maker">Maker</GlossaryTerm>
    );
    fireEvent.click(trigger("Maker"));

    const backdrop = baseElement.querySelector<HTMLElement>(
      'button[aria-hidden="true"]'
    );
    // aria-hidden on something a keyboard can land on is a contradiction the
    // browser resolves badly: focus goes somewhere a screen reader will not
    // describe.
    expect(backdrop!.tabIndex).toBe(-1);
  });
});

describe("the '?' beside a heading", () => {
  it("says which heading it belongs to", () => {
    // There are seven of these on the dashboard. "More info, button" seven
    // times tells a screen-reader user nothing about where they are.
    render(<GlossaryHint term="learning-styles" />);
    expect(trigger("What Learning Styles means")).toBeDefined();
  });

  it("opens the same popup as a tapped word does", () => {
    render(<GlossaryHint term="learning-styles" />);
    fireEvent.click(trigger("What Learning Styles means"));

    const dialog = screen.getByRole("dialog", { name: "Learning Styles" });
    expect(dialog.textContent).toContain(GLOSSARY["learning-styles"].body);
  });

  it("closes on Escape and returns focus, like every other trigger", () => {
    render(<GlossaryHint term="learning-styles" />);
    const button = trigger("What Learning Styles means");
    fireEvent.click(button);
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(button);
  });
});
