import { describe, it, expect } from "vitest";
import { chapterWord, chapterLabel } from "@/lib/copy/chapter";

describe("chapter wording", () => {
  it("uses Chapter in quest tone and Part in explorer tone", () => {
    expect(chapterWord("quest")).toBe("Chapter");
    expect(chapterWord("explorer")).toBe("Part");
  });

  it("numbers them", () => {
    expect(chapterLabel(1, "quest")).toBe("Chapter 1");
    expect(chapterLabel(2, "explorer")).toBe("Part 2");
  });
});
