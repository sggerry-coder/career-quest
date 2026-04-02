---
phase: 02
slug: session-completion-persistence
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | vitest.config.ts |
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
| 02-01-01 | 01 | 1 | DATA-02, DATA-03 | unit (TDD) | `npx vitest run lib/validation/__tests__/score-validation.test.ts -x` | Created in task | ⬜ pending |
| 02-01-02 | 01 | 1 | DATA-02, DATA-03 | unit (TDD) | `npx vitest run lib/validation/__tests__/error-classification.test.ts -x` | Created in task | ⬜ pending |
| 02-01-03 | 01 | 1 | COMP-03 | type-check | `npx tsc --noEmit 2>&1 \| head -5` | N/A (type + SQL) | ⬜ pending |
| 02-02-01 | 02 | 2 | DATA-01, COMP-04 | type-check | `npx tsc --noEmit 2>&1 \| head -20` | N/A (refactor) | ⬜ pending |
| 02-02-02 | 02 | 2 | COMP-01, COMP-02 | type-check + lint | `npx tsc --noEmit && npm run lint 2>&1 \| head -10` | Created in task | ⬜ pending |
| 02-03-01 | 03 | 3 | COMP-03 | type-check | `npx tsc --noEmit 2>&1 \| head -5` | N/A (modify existing) | ⬜ pending |
| 02-03-02 | 03 | 3 | COMP-03 | type-check + lint | `npx tsc --noEmit && npm run lint 2>&1 \| head -10` | N/A (modify existing) | ⬜ pending |
| 02-03-03 | 03 | 3 | ALL | manual | Browser test (checkpoint) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs created during Plan 01 Task 1 execution (TDD pattern — tests written in RED phase)
- [ ] canvas-confetti dynamic import testable via mock

*Existing infrastructure covers test runner and config.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Confetti animation plays | COMP-02 | Canvas rendering not testable in jsdom | Open browser, complete session, observe confetti burst |
| Reveal animation sequence | COMP-01 | Animation timing requires visual confirmation | Complete all questions, verify chart reveals in sequence |
| Return user redirect | COMP-03 | Full auth + redirect flow needs browser | Log out, log back in, verify dashboard shown |
| Static summary cards display | COMP-02 | Visual layout verification | Verify class label card and top strength card appear on completion screen |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
