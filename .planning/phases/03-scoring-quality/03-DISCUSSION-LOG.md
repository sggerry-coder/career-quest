# Phase 3: Scoring Quality - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 03-scoring-quality
**Areas discussed:** Empty/minimal chart behavior, "Still emerging" presentation, Undo reversal scope

---

## Empty/Minimal Chart Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Defensive UI | Charts clamp to zero, show "answer more" messaging | ✓ |
| Minimum coverage gate | Block completion until all frameworks have N responses | |

**User's choice:** Defensive UI (option 1)
**Notes:** User initially wanted the system to always provide enough questions to identify missing areas. Clarified that the confirmatory adaptive round already does this. Phase 3 adds defensive UI as safety net. Coverage gate noted as deferred idea.

---

## "Still Emerging" MBTI Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle tooltip | Hover to see uncertainty info | |
| Prominent pill/badge | Visible "Still Emerging" next to type code | ✓ |
| Replace type code | Show "??" instead of letter | |
| Banner warning | Alert-style warning about incomplete data | |

**User's choice:** Claude's discretion
**Notes:** User said "make the best judgement you can." Recommended visible pill/badge — not too hidden (tooltip), not too alarming (banner). Added raw count check (< 3 responses forces `_`).

---

## Undo Reversal Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Atomic multi-signal reversal | Undo reverses all framework signals from one answer | ✓ |
| Single-framework only | Keep current behavior, only undo primary framework | |
| Restrict undo to certain blocks | Disable undo for multi-signal questions | |

**User's choice:** Claude's discretion
**Notes:** User said "make the best judgement you can." Recommended atomic reversal — current behavior is a bug (SCORE-02), not a design choice.

## Claude's Discretion

- "Still emerging" visual treatment style
- Undo signal storage structure
- NaN guard placement in scoring functions

## Deferred Ideas

- Minimum coverage gate — flow engine change, not scoring fix. Future phase or Session 2.
