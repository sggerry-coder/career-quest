/**
 * @vitest-environment jsdom
 *
 * Task 7: on a shared classroom device the browser can still be signed in
 * as the previous student. This locks in that character creation blocks on
 * an explicit confirmation before it ever calls provisionStudent, that
 * cancelling never calls it at all, and that confirming passes
 * confirmedReplace: true through to the destructive call.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";

const h = vi.hoisted(() => ({
  pushMock: vi.fn(),
  provisionStudentMock: vi.fn(async (profile: Record<string, unknown>) => {
    void profile;
    return {
      success: true as const,
      studentId: "whoever",
      replacedExisting: false,
    };
  }),
  existingStudent: null as { id: string; name: string } | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.pushMock, replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () =>
        Promise.resolve({
          data: { user: h.existingStudent ? { id: h.existingStudent.id } : null },
        }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: h.existingStudent ? { name: h.existingStudent.name } : null,
              error: null,
            }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/persistence/provision-student", () => ({
  provisionStudent: h.provisionStudentMock,
}));

import CharacterPage from "@/app/quest/character/page";

async function fillOutWizard() {
  // Step 0 -> Step 1
  fireEvent.click(await screen.findByRole("button", { name: /continue to next step/i }));

  // Step 1: name, age, education
  fireEvent.change(await screen.findByLabelText(/adventurer name|your name/i), {
    target: { value: "Jordan" },
  });
  fireEvent.click(screen.getByRole("radio", { name: "Age 15" }));
  const educationGroup = screen.getByRole("radiogroup", { name: /education system selection/i });
  fireEvent.click(within(educationGroup).getAllByRole("radio")[0]);
  fireEvent.click(screen.getByRole("button", { name: /continue to next step/i }));

  // Step 2: destinations + curiosities
  const destinationGroup = await screen.findByRole("group", { name: /study destination selection/i });
  fireEvent.click(within(destinationGroup).getAllByRole("checkbox")[0]);
  const curiosityGroup = screen.getByRole("group", { name: /career curiosities selection/i });
  fireEvent.click(within(curiosityGroup).getAllByRole("checkbox")[0]);

  fireEvent.click(screen.getByRole("button", { name: /begin quest/i }));
}

beforeEach(() => {
  h.pushMock.mockClear();
  h.provisionStudentMock.mockClear();
  h.existingStudent = null;
});

afterEach(() => cleanup());

describe("character creation: replace-profile consent gate", () => {
  it("shows no confirmation and proceeds straight to the wizard for a brand-new device", async () => {
    render(<CharacterPage />);
    await screen.findByRole("radiogroup", { name: /choose your figure/i });
    expect(screen.queryByText(/This device is signed in as/)).toBeNull();
  });

  it("blocks on ReplaceProfileConfirm before showing the wizard when a student already exists on this device", async () => {
    h.existingStudent = { id: "student-1", name: "Priya" };
    render(<CharacterPage />);

    expect((await screen.findAllByText(/Priya/)).length).toBeGreaterThan(0);
    // The wizard itself must not be reachable yet.
    expect(screen.queryByRole("radiogroup", { name: /choose your figure/i })).toBeNull();
  });

  it("cancelling never calls provisionStudent and returns to the landing page", async () => {
    h.existingStudent = { id: "student-1", name: "Priya" };
    render(<CharacterPage />);

    const keepButton = await screen.findByRole("button", { name: /keep/i });
    fireEvent.click(keepButton);

    expect(h.provisionStudentMock).not.toHaveBeenCalled();
    expect(h.pushMock).toHaveBeenCalledWith("/");
  });

  it("does not call provisionStudent for any interaction before confirming", async () => {
    h.existingStudent = { id: "student-1", name: "Priya" };
    render(<CharacterPage />);
    await screen.findAllByText(/Priya/);
    expect(h.provisionStudentMock).not.toHaveBeenCalled();
  });

  it("confirming unlocks the wizard and submitting passes confirmedReplace: true", async () => {
    h.existingStudent = { id: "student-1", name: "Priya" };
    render(<CharacterPage />);

    const replaceButton = await screen.findByRole("button", {
      name: /delete|start over|replace/i,
    });
    fireEvent.click(replaceButton);

    await fillOutWizard();

    await waitFor(() => expect(h.provisionStudentMock).toHaveBeenCalledTimes(1));
    expect(h.provisionStudentMock.mock.calls[0][0]).toMatchObject({
      name: "Jordan",
      confirmedReplace: true,
    });
  });

  it("a genuinely new student is provisioned without confirmedReplace", async () => {
    render(<CharacterPage />);
    await fillOutWizard();

    await waitFor(() => expect(h.provisionStudentMock).toHaveBeenCalledTimes(1));
    expect(h.provisionStudentMock.mock.calls[0][0]).toMatchObject({
      name: "Jordan",
      confirmedReplace: false,
    });
  });
});
