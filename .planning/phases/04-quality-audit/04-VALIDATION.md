---
phase: 04
slug: quality-audit
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~1.5 seconds |

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
| 04-01-01 | 01 | 1 | AUDIT-01 | lint | `npx eslint . --max-warnings 0` | ✅ | ⬜ pending |
| 04-01-02 | 01 | 1 | AUDIT-02 | unit | `npx vitest run lib/scoring/__tests__/` | ✅ | ⬜ pending |
| 04-02-01 | 02 | 2 | AUDIT-04 | unit | `npx vitest run` | ✅ | ⬜ pending |
| 04-02-02 | 02 | 2 | AUDIT-03 | build | `npx next build` | ✅ | ⬜ pending |

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Error boundary fallback UI renders correctly | AUDIT-04 | Visual rendering of error state | Temporarily throw in a chart component, verify fallback shows with retry button |
| No animation jank on mid-range hardware | AUDIT-03 | Device-dependent runtime behavior | Run dev server, navigate through reveal sequence on throttled CPU |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
