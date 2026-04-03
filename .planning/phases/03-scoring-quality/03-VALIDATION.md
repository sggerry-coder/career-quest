---
phase: 03
slug: scoring-quality
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | SCORE-01 | unit | `npx vitest run lib/scoring/__tests__/mbti.test.ts` | ✅ | ⬜ pending |
| 03-01-02 | 01 | 1 | SCORE-02 | unit | `npx vitest run hooks/__tests__/use-scores.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | SCORE-03 | unit | `npx vitest run lib/scoring/__tests__/` | ✅ | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `hooks/__tests__/use-scores.test.ts` — test stubs for undo reversal (SCORE-02)

*Existing test infrastructure covers SCORE-01 and SCORE-03.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "Still Emerging" pill visible next to MBTI type | SCORE-01 | Visual UI element | Run dev server, complete partial session, verify pill appears on dashboard and reveal |
| Charts display at zero without NaN | SCORE-03 | Visual rendering | Run dev server with fresh student, verify charts render at 0 without blank/broken state |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
