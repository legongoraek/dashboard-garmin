# Phases 8-10 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all remaining code-only work for phases 8-10 while keeping external credentials and infrastructure as activation blockers rather than implementation blockers.

**Architecture:** Keep the provider-agnostic canonical model as the source of truth. Finish multisource dedup safeguards, make local verification self-testing and authoritative, and add runtime verification that starts the backend on an ephemeral port and validates liveness/readiness without external provider credentials.

**Tech Stack:** Node.js 22+, React/Vite, Express 5, Node test runner, IndexedDB, PostgreSQL/PostGIS optional runtime.

**Spec:** `docs/superpowers/specs/2026-09-13-multisource-analytics-architecture-design.md`

## Global Constraints

- Development is direct to `main` by explicit user instruction.
- GitHub Actions/CI/CD is optional and must not be the source of truth for validation.
- `npm run verify` is the local technical gate.
- Missing canonical values remain `null`; never coerce missing measurements to zero.
- Do not invent Garmin Developer, Strava, or PostgreSQL credentials/services.
- Continue around external blockers and document them.

---

### Task 1: Make the local verifier test itself

**Files:**
- Modify: `scripts/verificationPlan.test.mjs`
- Modify: `scripts/verificationPlan.mjs`

**Interfaces:**
- Consumes: root `package.json` script `test`.
- Produces: `buildVerificationSteps()` sequence with `root:test` included in full and quick verification.

- [ ] **Step 1: Write the failing test** asserting `root:test` is part of the verification sequence.
- [ ] **Step 2: Run the isolated Node test and confirm RED** because current sequence starts with `client:test`.
- [ ] **Step 3: Implement minimal change** by adding `{ label: "root:test", cwd: rootDir, args: ["test"] }` after optional installs and before client validation.
- [ ] **Step 4: Run isolated tests and confirm GREEN.**
- [ ] **Step 5: Commit directly to `main`.**

### Task 2: Add self-contained backend runtime verification

**Files:**
- Create: `scripts/runtimeVerify.mjs`
- Create: `scripts/runtimeVerify.test.mjs`
- Modify: `server/index.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: Express `app`, existing `runSmoke()`.
- Produces: `startServer()` export from server, `npm run verify:runtime`, deterministic ephemeral-port smoke verification.

- [ ] **Step 1: Write failing tests** for resolving an ephemeral server URL and guaranteed server close behavior.
- [ ] **Step 2: Verify RED** before production implementation.
- [ ] **Step 3: Refactor `server/index.js` minimally** to export `app` and `startServer(port)` while preserving normal `node index.js` startup.
- [ ] **Step 4: Implement `runtimeVerify.mjs`** to start on port `0`, derive the assigned port, call `runSmoke`, and close the server in `finally`.
- [ ] **Step 5: Add `verify:runtime` script** at the repository root.
- [ ] **Step 6: Run isolated helper tests and, on a real checkout with dependencies installed, run `npm run verify:runtime`.**

### Task 3: Integrate runtime verification into the full local gate

**Files:**
- Modify: `scripts/verificationPlan.test.mjs`
- Modify: `scripts/verificationPlan.mjs`

**Interfaces:**
- Consumes: root `verify:runtime` command.
- Produces: full `npm run verify` sequence that verifies tests, lint, build, server tests, and backend runtime smoke.

- [ ] **Step 1: Add failing expectation** that full verification ends with `root:runtime`, while `verify:quick` remains tests-only.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Add `{ label: "root:runtime", cwd: rootDir, args: ["run", "verify:runtime"] }` only for non-quick verification.**
- [ ] **Step 4: Verify GREEN.**

### Task 4: Production operability hardening

**Files:**
- Create: `server/runtimeLifecycle.js`
- Create: `server/runtimeLifecycle.test.js`
- Modify: `server/index.js`

**Interfaces:**
- Consumes: Node HTTP server returned by `app.listen()`.
- Produces: idempotent graceful shutdown handler for `SIGTERM` and `SIGINT`.

- [ ] **Step 1: Write failing tests** for idempotent close and exit-code behavior without terminating the test process.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement lifecycle helper** with injected `exitFn` and logger for testability.
- [ ] **Step 4: Wire lifecycle handlers only for direct server execution.**
- [ ] **Step 5: Verify GREEN.**

### Task 5: Final phase status and reproducible commands

**Files:**
- Modify: `README.md`
- Modify: `.claude/ESTADO.md`

**Interfaces:**
- Produces: exact local validation commands and a clean separation between code-complete items and external activation blockers.

- [ ] **Step 1: Document `npm run verify:install`, `npm run verify`, `npm run verify:quick`, `npm run verify:runtime`, and `npm run smoke`.**
- [ ] **Step 2: Record phases 8-10 code status and external blockers.**
- [ ] **Step 3: Run the strongest verification available in the current environment and report only evidence actually observed.**
