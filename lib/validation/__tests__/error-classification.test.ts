import { describe, it, expect } from "vitest";
import { classifySupabaseError, type ErrorCategory } from "../error-classification";

describe("classifySupabaseError", () => {
  describe("auth errors", () => {
    it("classifies status 401 as auth", () => {
      expect(classifySupabaseError({ status: 401 })).toBe("auth");
    });

    it("classifies status 403 as auth", () => {
      expect(classifySupabaseError({ status: 403 })).toBe("auth");
    });

    it("classifies PGRST301 code as auth", () => {
      expect(classifySupabaseError({ code: "PGRST301" })).toBe("auth");
    });
  });

  describe("network errors", () => {
    it("classifies 'Failed to fetch' as network", () => {
      expect(classifySupabaseError({ message: "Failed to fetch" })).toBe("network");
    });

    it("classifies message containing 'timeout' as network", () => {
      expect(classifySupabaseError({ message: "Request timeout after 30s" })).toBe("network");
    });
  });

  describe("unknown errors", () => {
    it("classifies unrecognized error code as unknown", () => {
      expect(classifySupabaseError({ code: "SOMETHING_ELSE" })).toBe("unknown");
    });

    it("classifies null error as unknown", () => {
      expect(classifySupabaseError(null)).toBe("unknown");
    });

    it("classifies undefined error as unknown", () => {
      expect(classifySupabaseError(undefined)).toBe("unknown");
    });

    it("classifies non-object error as unknown", () => {
      expect(classifySupabaseError("string error")).toBe("unknown");
    });
  });
});
