// Re-export class definitions from theme for convenience.
// All class data lives in lib/theme.ts as the single source of truth.
// This file provides a data-layer import path for components that
// don't need the full theme system.

export { classDefinitions, classDefinitions as classes } from "@/lib/theme";
export type { ClassDefinition } from "@/lib/theme";
