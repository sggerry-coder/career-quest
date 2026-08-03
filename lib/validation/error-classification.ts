export type ErrorCategory = "network" | "auth" | "unknown";

export interface PersistResult {
  success: boolean;
  errorType?: ErrorCategory;
  message?: string;
}

/**
 * Classify a Supabase error into a category for retry/abort decisions.
 * Auth errors (401, 403, PGRST301) are non-recoverable.
 * Network errors (fetch failures, timeouts) are recoverable with retry.
 * @param error - The error object from a Supabase operation
 * @returns The error category
 */
export function classifySupabaseError(error: unknown): ErrorCategory {
  if (!error || typeof error !== "object") return "unknown";

  const err = error as { code?: string; status?: number; message?: string };

  // Auth/permission errors are non-recoverable.
  //
  // Match on `code` as well as `status`: supabase-js surfaces PostgrestError
  // objects, which carry { message, details, hint, code } and NO status field.
  // Checking status alone let a row-level-security denial fall through to
  // "unknown", which the UI reports as "check your connection" -- sending the
  // student to fix their wifi over a permissions problem.
  if (err.status === 401 || err.status === 403) return "auth";
  if (err.code === "PGRST301" || err.code === "PGRST302") return "auth";
  // 42501 insufficient_privilege — RLS denied the write.
  if (err.code === "42501") return "auth";

  // Network/timeout errors are recoverable
  if (err.message?.includes("fetch") || err.message?.includes("network")) return "network";
  if (err.message?.includes("timeout")) return "network";

  return "unknown";
}
