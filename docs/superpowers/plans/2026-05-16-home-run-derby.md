# Home Run Derby Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a baseball-themed game to the kids-homework-games site where math problems gate a click-timing swing minigame and hits play out on a top-down diamond.

**Architecture:** A new game folder under `src/games/home-run-derby/`. The main component is a phase machine (`intro` → `pitch` → `swing` → `outcome` → `between-pitches` → `done`) with top-level runner/score state. Pure gameplay logic (swing classification, runner advancement) lives in `hitMath.ts` and is unit-tested with Vitest. UI components (PitchScreen, SwingMinigame, DiamondView) follow the existing `MathDefense` rendering style (Tailwind, no animation libraries — CSS transitions and inline-styled animations only). Registered as one more `GameDef` and wired into `App.tsx` next to the other "playing-problem" games.

**Tech Stack:** React 19 + TypeScript + Tailwind, Vitest (new — first tests in the repo), existing `Problem` discriminated union, existing `isAnswerCorrect`/`shuffle`/`playCorrect`/`playWrong` helpers, existing `SessionResult` lifecycle.

**Reference spec:** `docs/superpowers/specs/2026-05-16-home-run-derby-design.md`

---

## File Map

**Create:**
- `src/games/home-run-derby/hitMath.ts` — pure: `classifySwing()`, `advanceRunners()`, `HitResult` type, `Runners` type
- `src/games/home-run-derby/hitMath.test.ts` — Vitest tests for the above
- `src/games/home-run-derby/HomeRunDerby.tsx` — main component: phase machine, top-level state, intro/outro/quit, calls into sub-components
- `src/games/home-run-derby/PitchScreen.tsx` — batter-view background, problem card, answer UI (MC/numeric/T-F)
- `src/games/home-run-derby/SwingMinigame.tsx` — ball animation, sweet-spot crosshair, pointer handlers
- `src/games/home-run-derby/DiamondView.tsx` — top-down field, ball arc, runner animation, result banner
- `src/games/home-run-derby/index.ts` — `export { HomeRunDerby }`
- `vitest.config.ts` — minimal Vitest config (jsdom not needed; pure logic only)

**Modify:**
- `package.json` — add `vitest` devDep, add `test` script
- `src/lib/sounds.ts` — add `playCrack()` and `playCheer()`
- `src/lib/games-registry.ts` — append the new `GameDef`
- `src/App.tsx` — import `HomeRunDerby` and add to the `playing-problem` switch
- `.gitignore` — add `coverage/` (Vitest default coverage output)

---

## Task 1: Set up Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Install Vitest as a dev dependency**

Run: `npm install --save-dev vitest@^3`

Expected: `package.json` `devDependencies` includes `vitest`, and a fresh `package-lock.json` entry. No new runtime deps.

- [ ] **Step 2: Add `test` script in `package.json`**

In the `"scripts"` block, add a `"test"` entry. The final scripts block should look like:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "typecheck": "tsc -b",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Create `vitest.config.ts` at the repo root**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
```

This mirrors the `@` alias that `vite.config.ts` uses for source imports, so tests can import `@/...` paths.

- [ ] **Step 4: Update `.gitignore` to exclude Vitest coverage output**

Append:

```
# Vitest coverage
coverage/
```

- [ ] **Step 5: Smoke-test the runner with no tests**

Run: `npm run test`
Expected: Vitest reports "No test files found" (this is fine — it confirms the runner works). Exit code 0 or 1 — accept either; we just want no config errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts .gitignore
git commit -m "Add Vitest for unit-testing pure game logic"
```

---

## Task 2: Implement `hitMath.ts` (pure logic) with TDD

**Files:**
- Create: `src/games/home-run-derby/hitMath.ts`
- Create: `src/games/home-run-derby/hitMath.test.ts`

- [ ] **Step 1: Write failing tests for `classifySwing()`**

Create `src/games/home-run-derby/hitMath.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import {
  advanceRunners,
  classifySwing,
  type Runners,
} from "./hitMath";

describe("classifySwing", () => {
  const ball = { ballX: 100, ballY: 100, ballRadius: 20 };

  test("dead-center click is a home run", () => {
    expect(classifySwing({ clickX: 100, clickY: 100, ...ball })).toEqual({
      kind: "homerun",
    });
  });

  test("click within 15% of radius is a home run", () => {
    // d = 2/20 = 0.10
    expect(classifySwing({ clickX: 102, clickY: 100, ...ball })).toEqual({
      kind: "homerun",
    });
  });

  test("click at 25% of radius is a triple", () => {
    // d = 5/20 = 0.25
    expect(classifySwing({ clickX: 105, clickY: 100, ...ball })).toEqual({
      kind: "triple",
    });
  });

  test("click at 50% of radius is a double", () => {
    // d = 10/20 = 0.5
    expect(classifySwing({ clickX: 110, clickY: 100, ...ball })).toEqual({
      kind: "double",
    });
  });

  test("click at 75% of radius is a single", () => {
    // d = 15/20 = 0.75
    expect(classifySwing({ clickX: 115, clickY: 100, ...ball })).toEqual({
      kind: "single",
      weak: false,
    });
  });

  test("click at 90% of radius is a weak single", () => {
    // d = 18/20 = 0.90
    expect(classifySwing({ clickX: 118, clickY: 100, ...ball })).toEqual({
      kind: "single",
      weak: true,
    });
  });

  test("click outside the ball (d > 1) is a whiff", () => {
    // d = 25/20 = 1.25
    expect(classifySwing({ clickX: 125, clickY: 100, ...ball })).toEqual({
      kind: "whiff",
    });
  });

  test("diagonal click uses Euclidean distance", () => {
    // dx=3, dy=4, d = 5/20 = 0.25 → triple
    expect(classifySwing({ clickX: 103, clickY: 104, ...ball })).toEqual({
      kind: "triple",
    });
  });
});

describe("advanceRunners", () => {
  const empty: Runners = { first: false, second: false, third: false };

  test("home run with bases empty scores 1 run, clears bases", () => {
    const result = advanceRunners({
      runners: empty,
      hit: { kind: "homerun" },
    });
    expect(result.runsScored).toBe(1);
    expect(result.runners).toEqual({
      first: false,
      second: false,
      third: false,
    });
  });

  test("grand slam scores 4 runs, clears bases", () => {
    const result = advanceRunners({
      runners: { first: true, second: true, third: true },
      hit: { kind: "homerun" },
    });
    expect(result.runsScored).toBe(4);
    expect(result.runners).toEqual({
      first: false,
      second: false,
      third: false,
    });
  });

  test("single with bases empty puts batter on 1B", () => {
    const result = advanceRunners({
      runners: empty,
      hit: { kind: "single", weak: false },
    });
    expect(result.runsScored).toBe(0);
    expect(result.runners).toEqual({
      first: true,
      second: false,
      third: false,
    });
  });

  test("single with runner on 2B scores 1 run (runner crosses home)", () => {
    const result = advanceRunners({
      runners: { first: false, second: true, third: false },
      hit: { kind: "single", weak: false },
    });
    expect(result.runsScored).toBe(1);
    expect(result.runners).toEqual({
      first: true,
      second: false,
      third: false,
    });
  });

  test("weak single with runner on 2B does NOT score (held at 3B)", () => {
    const result = advanceRunners({
      runners: { first: false, second: true, third: false },
      hit: { kind: "single", weak: true },
    });
    expect(result.runsScored).toBe(0);
    expect(result.runners).toEqual({
      first: true,
      second: false,
      third: true,
    });
  });

  test("weak single with runner on 3B still scores (only the 2B exception applies)", () => {
    const result = advanceRunners({
      runners: { first: false, second: false, third: true },
      hit: { kind: "single", weak: true },
    });
    expect(result.runsScored).toBe(1);
    expect(result.runners).toEqual({
      first: true,
      second: false,
      third: false,
    });
  });

  test("double with runner on 1B puts them on 3B (no score)", () => {
    const result = advanceRunners({
      runners: { first: true, second: false, third: false },
      hit: { kind: "double" },
    });
    expect(result.runsScored).toBe(0);
    expect(result.runners).toEqual({
      first: false,
      second: true,
      third: true,
    });
  });

  test("double with runners on 1B and 3B scores 1, leaves 2B and 3B", () => {
    const result = advanceRunners({
      runners: { first: true, second: false, third: true },
      hit: { kind: "double" },
    });
    expect(result.runsScored).toBe(1);
    expect(result.runners).toEqual({
      first: false,
      second: true,
      third: true,
    });
  });

  test("triple with bases loaded scores 3 runs, batter on 3B", () => {
    const result = advanceRunners({
      runners: { first: true, second: true, third: true },
      hit: { kind: "triple" },
    });
    expect(result.runsScored).toBe(3);
    expect(result.runners).toEqual({
      first: false,
      second: false,
      third: true,
    });
  });

  test("whiff does not change runners and scores 0", () => {
    const start: Runners = { first: true, second: false, third: true };
    const result = advanceRunners({
      runners: start,
      hit: { kind: "whiff" },
    });
    expect(result.runsScored).toBe(0);
    expect(result.runners).toEqual(start);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test`
Expected: Vitest reports "Cannot find module './hitMath'" or "hitMath has no exports" — all tests fail because the implementation doesn't exist yet.

- [ ] **Step 3: Implement `hitMath.ts`**

Create `src/games/home-run-derby/hitMath.ts`:

```ts
export type HitResult =
  | { kind: "homerun" }
  | { kind: "triple" }
  | { kind: "double" }
  | { kind: "single"; weak: boolean }
  | { kind: "whiff" };

export interface Runners {
  first: boolean;
  second: boolean;
  third: boolean;
}

export function classifySwing(args: {
  clickX: number;
  clickY: number;
  ballX: number;
  ballY: number;
  ballRadius: number;
}): HitResult {
  const dx = args.clickX - args.ballX;
  const dy = args.clickY - args.ballY;
  const d = Math.sqrt(dx * dx + dy * dy) / args.ballRadius;
  if (d > 1) return { kind: "whiff" };
  if (d < 0.15) return { kind: "homerun" };
  if (d < 0.35) return { kind: "triple" };
  if (d < 0.6) return { kind: "double" };
  if (d < 0.85) return { kind: "single", weak: false };
  return { kind: "single", weak: true };
}

/**
 * Move existing runners and the batter based on the hit, count runs.
 * Weak-single rule: a runner on 2B stops at 3B instead of scoring.
 */
export function advanceRunners(args: {
  runners: Runners;
  hit: HitResult;
}): { runners: Runners; runsScored: number } {
  const { runners, hit } = args;
  if (hit.kind === "whiff") {
    return { runners, runsScored: 0 };
  }

  const bases = hit.kind === "homerun"
    ? 4
    : hit.kind === "triple"
      ? 3
      : hit.kind === "double"
        ? 2
        : 1;
  const weakSingle = hit.kind === "single" && hit.weak;

  // Slot 0 = batter at home. Slots 1/2/3 = existing 1B/2B/3B runners.
  const startingBases = [
    0,
    runners.first ? 1 : null,
    runners.second ? 2 : null,
    runners.third ? 3 : null,
  ].filter((b): b is number => b !== null);

  let runsScored = 0;
  const next: Runners = { first: false, second: false, third: false };

  for (const startBase of startingBases) {
    let endBase = startBase + bases;
    // Weak-single rule: runner starting on 2B is held at 3B.
    if (weakSingle && startBase === 2 && endBase >= 4) {
      endBase = 3;
    }
    if (endBase >= 4) {
      runsScored += 1;
    } else if (endBase === 1) {
      next.first = true;
    } else if (endBase === 2) {
      next.second = true;
    } else if (endBase === 3) {
      next.third = true;
    }
  }

  return { runners: next, runsScored };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test`
Expected: All tests pass. If any fail, fix the implementation (the test cases are the source of truth — do NOT change tests to make them pass; the spec table dictates the thresholds).

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/games/home-run-derby/hitMath.ts src/games/home-run-derby/hitMath.test.ts
git commit -m "Home Run Derby: pure hit/runner logic + tests"
```

---

## Task 3: Add `playCrack` and `playCheer` sound helpers

**Files:**
- Modify: `src/lib/sounds.ts`

- [ ] **Step 1: Read the current `sounds.ts`**

Use the Read tool on `src/lib/sounds.ts` to confirm the existing structure (tone helper + playCorrect/playWrong/playLevelUp).

- [ ] **Step 2: Append two new exports**

Add these functions at the end of `src/lib/sounds.ts`:

```ts
export function playCrack() {
  // Sharp short percussive "crack of the bat"
  tone(600, 70, "sawtooth");
}

export function playCheer() {
  // Rising chord for HR or scoring play
  tone(523, 110);
  setTimeout(() => tone(659, 110), 90);
  setTimeout(() => tone(784, 220), 180);
}
```

Both reuse the existing `tone()` helper which already respects `isMuted()`.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/sounds.ts
git commit -m "Home Run Derby: add bat-crack and cheer sound helpers"
```

---

## Task 4: Build `HomeRunDerby.tsx` shell (intro, outro, phase machine, no gameplay yet)

This task scaffolds the main component with the intro/outro screens and the phase state machine, but the `pitch` / `swing` / `outcome` / `between-pitches` phases just render placeholders. Subsequent tasks fill them in.

**Files:**
- Create: `src/games/home-run-derby/HomeRunDerby.tsx`
- Create: `src/games/home-run-derby/index.ts`

- [ ] **Step 1: Create `HomeRunDerby.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { Problem, ProblemSet } from "@/types/content";
import type { SessionResult } from "@/types/profile";
import { isAnswerCorrect, shuffle } from "@/lib/problem-pool";
import { playCorrect, playWrong } from "@/lib/sounds";
import {
  advanceRunners,
  type HitResult,
  type Runners,
} from "./hitMath";

const EMPTY_RUNNERS: Runners = { first: false, second: false, third: false };

type Phase =
  | { kind: "intro" }
  | { kind: "pitch" }
  | { kind: "swing"; problem: Problem; startTimeMs: number }
  | { kind: "outcome"; hit: HitResult; runsScored: number }
  | { kind: "between-pitches" }
  | { kind: "done" };

interface Props {
  set: ProblemSet;
  profileId: string;
  onExit: () => void;
  onComplete: (result: SessionResult) => void;
}

export function HomeRunDerby({ set, profileId, onExit, onComplete }: Props) {
  const problems = useMemo(() => shuffle(set.problems), [set]);
  const problemIndexRef = useRef(0);
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  const [runs, setRuns] = useState(0);
  const [outs, setOuts] = useState(0);
  const [strikesThisAB, setStrikesThisAB] = useState(0);
  const [runners, setRunners] = useState<Runners>(EMPTY_RUNNERS);
  const [problemsAttempted, setProblemsAttempted] = useState(0);
  const [problemsCorrect, setProblemsCorrect] = useState(0);
  const [hitBreakdown, setHitBreakdown] = useState<Record<string, number>>({});
  const [startedAt] = useState(() => Date.now());
  const completedRef = useRef(false);

  function startGame() {
    problemIndexRef.current = 0;
    setRuns(0);
    setOuts(0);
    setStrikesThisAB(0);
    setRunners(EMPTY_RUNNERS);
    setProblemsAttempted(0);
    setProblemsCorrect(0);
    setHitBreakdown({});
    setPhase({ kind: "pitch" });
  }

  function nextPhaseAfterResolution() {
    // Called after an at-bat ends OR after a non-out strike.
    // If we're out of problems, end the game.
    if (problemIndexRef.current >= problems.length) {
      setPhase({ kind: "done" });
      return;
    }
    if (outs >= 3) {
      setPhase({ kind: "done" });
      return;
    }
    setPhase({ kind: "pitch" });
  }

  function handleWrongAnswer(problem: Problem) {
    playWrong();
    setProblemsAttempted((n) => n + 1);
    problemIndexRef.current += 1;
    const newStrikes = strikesThisAB + 1;
    if (newStrikes >= 3) {
      setStrikesThisAB(0);
      const newOuts = outs + 1;
      setOuts(newOuts);
      // Show OUT banner via the outcome phase
      setHitBreakdown((b) => ({ ...b, strikeout: (b.strikeout ?? 0) + 1 }));
      setPhase({
        kind: "outcome",
        hit: { kind: "whiff" }, // re-used to mean "out" for the banner
        runsScored: 0,
      });
    } else {
      setStrikesThisAB(newStrikes);
      // Brief "STRIKE" banner via outcome, but no runner change
      setPhase({
        kind: "outcome",
        hit: { kind: "whiff" },
        runsScored: 0,
      });
    }
    // Suppress lint about unused param (kept for future use in feedback text)
    void problem;
  }

  function handleCorrectAnswer(problem: Problem) {
    playCorrect();
    setProblemsAttempted((n) => n + 1);
    setProblemsCorrect((n) => n + 1);
    setPhase({
      kind: "swing",
      problem,
      startTimeMs: Date.now(),
    });
  }

  function handleSwingResolved(hit: HitResult) {
    problemIndexRef.current += 1;
    setHitBreakdown((b) => ({ ...b, [hit.kind]: (b[hit.kind] ?? 0) + 1 }));
    if (hit.kind === "whiff") {
      const newStrikes = strikesThisAB + 1;
      if (newStrikes >= 3) {
        setStrikesThisAB(0);
        setOuts((o) => o + 1);
      } else {
        setStrikesThisAB(newStrikes);
      }
      setPhase({ kind: "outcome", hit, runsScored: 0 });
      return;
    }
    // Fair hit — advance runners
    const { runners: nextRunners, runsScored } = advanceRunners({
      runners,
      hit,
    });
    setRunners(nextRunners);
    setRuns((r) => r + runsScored);
    setStrikesThisAB(0);
    setPhase({ kind: "outcome", hit, runsScored });
  }

  // After the outcome banner displays for a moment, advance.
  useEffect(() => {
    if (phase.kind !== "outcome") return;
    const id = window.setTimeout(() => {
      setPhase({ kind: "between-pitches" });
    }, 1800);
    return () => window.clearTimeout(id);
  }, [phase]);

  // Brief pause between pitches, then next pitch (or done).
  useEffect(() => {
    if (phase.kind !== "between-pitches") return;
    const id = window.setTimeout(() => {
      nextPhaseAfterResolution();
    }, 500);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Fire completion exactly once when the game ends.
  useEffect(() => {
    if (phase.kind === "done" && !completedRef.current) {
      completedRef.current = true;
      onComplete({
        profileId,
        setId: set.id,
        gameId: "home-run-derby",
        completedAt: Date.now(),
        problemsAttempted,
        problemsCorrect,
        durationMs: Date.now() - startedAt,
      });
    }
  }, [
    phase.kind,
    profileId,
    set.id,
    problemsAttempted,
    problemsCorrect,
    startedAt,
    onComplete,
  ]);

  if (phase.kind === "intro") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-sky-700 to-green-800 p-4 text-white">
        <div className="mx-auto max-w-md pt-12 text-center">
          <div className="rounded-3xl bg-slate-900/70 p-8 shadow-md ring-1 ring-sky-400/30">
            <h1 className="text-3xl font-extrabold text-yellow-300">
              ⚾ Home Run Derby
            </h1>
            <p className="mt-3">
              Each problem is one pitch. Answer right to swing — time your click
              perfectly for a home run!
            </p>
            <p className="mt-2 text-sm text-sky-200/80">
              3 strikes = an out. 3 outs ends the game.
            </p>
            <button
              type="button"
              onClick={startGame}
              className="mt-6 w-full rounded-2xl bg-yellow-400 py-4 text-xl font-bold text-slate-900 hover:bg-yellow-300"
            >
              Play ball!
            </button>
            <button
              type="button"
              onClick={onExit}
              className="mt-2 w-full rounded-xl py-2 text-sky-200/70 hover:text-sky-200"
            >
              Back
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (phase.kind === "done") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-sky-700 to-green-800 p-4 text-white">
        <div className="mx-auto max-w-md pt-12 text-center">
          <div className="rounded-3xl bg-slate-900/70 p-8 shadow-md ring-1 ring-sky-400/30">
            <h2 className="text-3xl font-extrabold text-yellow-300">
              🏟 Game over
            </h2>
            <p className="mt-4 text-2xl font-bold">{runs} runs scored</p>
            <p className="mt-2 text-lg">
              {problemsCorrect} / {problemsAttempted} correct
            </p>
            <ul className="mt-4 space-y-1 text-sm text-sky-100/80">
              {hitBreakdown.homerun ? <li>⚾ Home runs: {hitBreakdown.homerun}</li> : null}
              {hitBreakdown.triple ? <li>Triples: {hitBreakdown.triple}</li> : null}
              {hitBreakdown.double ? <li>Doubles: {hitBreakdown.double}</li> : null}
              {hitBreakdown.single ? <li>Singles: {hitBreakdown.single}</li> : null}
              {hitBreakdown.strikeout ? <li>Strikeouts: {hitBreakdown.strikeout}</li> : null}
            </ul>
            <button
              type="button"
              onClick={onExit}
              className="mt-6 w-full rounded-2xl bg-yellow-400 py-4 text-xl font-bold text-slate-900 hover:bg-yellow-300"
            >
              Back to home
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Placeholder render for in-game phases — filled in by later tasks.
  const currentProblem = problems[problemIndexRef.current];
  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-700 to-green-800 p-4 text-white">
      <div className="mx-auto max-w-2xl pt-6">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg bg-white/10 px-3 py-1 text-sm font-semibold hover:bg-white/20"
          >
            ← Quit
          </button>
          <div className="flex items-center gap-3 text-sm font-bold">
            <span className="rounded-full bg-rose-400/30 px-3 py-1">
              S {strikesThisAB}
            </span>
            <span className="rounded-full bg-slate-700/60 px-3 py-1">
              O {outs}
            </span>
            <span className="rounded-full bg-yellow-400/30 px-3 py-1">
              {runs} runs
            </span>
          </div>
        </header>

        <div className="mt-8 rounded-3xl bg-slate-900/70 p-6 text-center">
          <p className="text-xs uppercase tracking-wide text-sky-200/60">
            Phase: {phase.kind}
          </p>
          <p className="mt-2 text-2xl font-bold">
            {currentProblem?.prompt ?? "(no more problems)"}
          </p>
          <p className="mt-4 text-sm text-sky-100/70">
            (Gameplay UI for this phase wired in a later task.)
          </p>
          {/* Dev-only buttons so the shell is reachable end-to-end before sub-components land. */}
          {phase.kind === "pitch" && currentProblem && (
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => handleCorrectAnswer(currentProblem)}
                className="rounded-xl bg-emerald-400 px-4 py-2 font-bold text-slate-900"
              >
                (dev) Correct
              </button>
              <button
                type="button"
                onClick={() => handleWrongAnswer(currentProblem)}
                className="rounded-xl bg-rose-400 px-4 py-2 font-bold text-slate-900"
              >
                (dev) Wrong
              </button>
            </div>
          )}
          {phase.kind === "swing" && (
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => handleSwingResolved({ kind: "homerun" })}
                className="rounded-xl bg-yellow-400 px-4 py-2 font-bold text-slate-900"
              >
                (dev) Home run
              </button>
              <button
                type="button"
                onClick={() => handleSwingResolved({ kind: "single", weak: false })}
                className="rounded-xl bg-yellow-200 px-4 py-2 font-bold text-slate-900"
              >
                (dev) Single
              </button>
              <button
                type="button"
                onClick={() => handleSwingResolved({ kind: "whiff" })}
                className="rounded-xl bg-rose-300 px-4 py-2 font-bold text-slate-900"
              >
                (dev) Whiff
              </button>
            </div>
          )}
        </div>

        {/* Suppress unused-var lint for isAnswerCorrect — used in PitchScreen in next task */}
        <span className="hidden">{isAnswerCorrect.name}</span>
      </div>
    </main>
  );
}
```

> **Note:** The "(dev)" buttons let the engineer walk the phase machine end-to-end before the sub-components exist. They will be removed in tasks 5 and 6 when the real PitchScreen and SwingMinigame replace this placeholder.

- [ ] **Step 2: Create `index.ts`**

```ts
export { HomeRunDerby } from "./HomeRunDerby";
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No errors. If the unused-import lint pings on `isAnswerCorrect`, the hidden-span workaround above keeps it referenced; remove the workaround in Task 5 when PitchScreen actually uses it.

- [ ] **Step 4: Commit**

```bash
git add src/games/home-run-derby/HomeRunDerby.tsx src/games/home-run-derby/index.ts
git commit -m "Home Run Derby: shell with intro/outro and phase machine"
```

---

## Task 5: Implement `PitchScreen.tsx` and wire it into the `pitch` phase

**Files:**
- Create: `src/games/home-run-derby/PitchScreen.tsx`
- Modify: `src/games/home-run-derby/HomeRunDerby.tsx`

- [ ] **Step 1: Create `PitchScreen.tsx`**

Replicates the input UI style from `MathDefense.tsx`'s `Answer` sub-component, adapted to the baseball backdrop.

```tsx
import { useState } from "react";
import type { Problem } from "@/types/content";
import { isAnswerCorrect } from "@/lib/problem-pool";

interface Props {
  problem: Problem;
  onCorrect: () => void;
  onWrong: () => void;
}

export function PitchScreen({ problem, onCorrect, onWrong }: Props) {
  function submit(given: string) {
    if (isAnswerCorrect(problem, given)) {
      onCorrect();
    } else {
      onWrong();
    }
  }

  return (
    <div className="mt-6 rounded-3xl bg-slate-900/70 p-6 shadow-md ring-1 ring-sky-400/30">
      <h2 className="text-center text-3xl font-bold text-white">
        {problem.prompt}
      </h2>
      <Answer problem={problem} onSubmit={submit} />
    </div>
  );
}

function Answer({
  problem,
  onSubmit,
}: {
  problem: Problem;
  onSubmit: (given: string) => void;
}) {
  const [value, setValue] = useState("");

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim() === "") return;
    onSubmit(value);
    setValue("");
  }

  if (problem.format === "multiple-choice") {
    return (
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {problem.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSubmit(String(i))}
            className="rounded-xl bg-yellow-400 px-4 py-4 text-xl font-bold text-slate-900 hover:bg-yellow-300 active:scale-95"
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  if (problem.format === "true-false") {
    return (
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onSubmit("true")}
          className="rounded-xl bg-emerald-400 px-4 py-4 text-xl font-bold text-slate-900 hover:bg-emerald-300"
        >
          True
        </button>
        <button
          type="button"
          onClick={() => onSubmit("false")}
          className="rounded-xl bg-rose-400 px-4 py-4 text-xl font-bold text-slate-900 hover:bg-rose-300"
        >
          False
        </button>
      </div>
    );
  }

  // numeric (and fill-blank fallback — not in supportedFormats, but safe to render)
  return (
    <form onSubmit={handleFormSubmit} className="mt-6 flex gap-3">
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        className="flex-1 rounded-xl bg-yellow-50 px-4 py-4 text-center text-2xl font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-yellow-400"
        placeholder="?"
      />
      <button
        type="submit"
        disabled={value.trim() === ""}
        className="rounded-xl bg-yellow-400 px-6 py-4 text-xl font-bold text-slate-900 hover:bg-yellow-300 disabled:opacity-50"
      >
        Swing!
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Replace the dev-buttons block in `HomeRunDerby.tsx` with the real `PitchScreen`**

In `HomeRunDerby.tsx`:

1. Add the import at the top with the other game-local imports:

```tsx
import { PitchScreen } from "./PitchScreen";
```

2. Remove the `isAnswerCorrect` import line (it's now only used inside `PitchScreen`):

   - Replace `import { isAnswerCorrect, shuffle } from "@/lib/problem-pool";`
     with `import { shuffle } from "@/lib/problem-pool";`

3. Remove the hidden-span workaround:

   - Delete the line `<span className="hidden">{isAnswerCorrect.name}</span>` and its preceding comment.

4. In the placeholder JSX (the bottom block of the component), replace the `phase.kind === "pitch"` dev-buttons block with a real PitchScreen render. The placeholder div that wraps phase info should keep the HUD header, but the "Phase: pitch" block must be replaced by:

```tsx
{phase.kind === "pitch" && currentProblem && (
  <PitchScreen
    problem={currentProblem}
    onCorrect={() => handleCorrectAnswer(currentProblem)}
    onWrong={() => handleWrongAnswer(currentProblem)}
  />
)}
```

5. Keep the swing-phase dev buttons for now (they're replaced in Task 6).

6. Keep the `phase: <kind>` debug label for now too — it stays useful through the next two tasks. Remove it at the start of Task 7 (DiamondView), not now.

> The final shape of the in-game render block should be: HUD header, then conditional UI per phase. If `phase.kind === "pitch"`, render `<PitchScreen ... />`. Otherwise render the placeholder card with phase-name + dev buttons (`swing` phase keeps its dev buttons).

- [ ] **Step 3: Run typecheck and dev server**

```
npm run typecheck
npm run dev
```

Open the dev URL, switch to a profile with problem sets, start Home Run Derby, and verify:
- The intro screen looks right.
- After "Play ball!", a real math problem appears with the right answer UI for its format.
- A correct answer transitions to the `swing` phase (the placeholder dev buttons appear).
- A wrong answer transitions to the `outcome` → `between-pitches` → next `pitch` cycle, and the strike counter increments.
- 3 wrongs in one at-bat increments OUTS.
- 3 OUTs total navigates to the outro screen.

- [ ] **Step 4: Commit**

```bash
git add src/games/home-run-derby/PitchScreen.tsx src/games/home-run-derby/HomeRunDerby.tsx
git commit -m "Home Run Derby: real PitchScreen with problem + answer UI"
```

---

## Task 6: Implement `SwingMinigame.tsx` and wire it into the `swing` phase

**Files:**
- Create: `src/games/home-run-derby/SwingMinigame.tsx`
- Modify: `src/games/home-run-derby/HomeRunDerby.tsx`

The minigame renders the strike zone, an animated ball (CSS transition over ~900 ms), and a sweet-spot crosshair that follows the pointer. On pointer-down (or animation end with no pointer-down), it calls `classifySwing` and reports the `HitResult` to the parent.

- [ ] **Step 1: Create `SwingMinigame.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import { classifySwing, type HitResult } from "./hitMath";
import { playCrack } from "@/lib/sounds";

interface Props {
  onSwing: (hit: HitResult) => void;
}

const PITCH_DURATION_MS = 900;
// Layout constants (percentages of the strike-zone container)
const BALL_START = { xPct: 50, yPct: 10, scale: 0.2 };
const BALL_END = { xPct: 50, yPct: 80, scale: 1.0 };
const BALL_DIAMETER_AT_END_PX = 56; // visual ball size when "in the zone"

export function SwingMinigame({ onSwing }: Props) {
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const resolvedRef = useRef(false);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);

  // Auto-resolve as whiff if the pitch passes without a swing.
  useEffect(() => {
    startedAtRef.current = Date.now();
    resolvedRef.current = false;
    const id = window.setTimeout(() => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      onSwing({ kind: "whiff" });
    }, PITCH_DURATION_MS + 80); // small grace to avoid double-resolution race
    return () => window.clearTimeout(id);
  }, [onSwing]);

  function ballPositionNow(zoneRect: DOMRect): {
    x: number;
    y: number;
    radius: number;
  } {
    const tRaw = (Date.now() - startedAtRef.current) / PITCH_DURATION_MS;
    const t = Math.max(0, Math.min(1, tRaw));
    // ease-out: 1 - (1-t)^2
    const eased = 1 - (1 - t) * (1 - t);
    const xPct = BALL_START.xPct + (BALL_END.xPct - BALL_START.xPct) * eased;
    const yPct = BALL_START.yPct + (BALL_END.yPct - BALL_START.yPct) * eased;
    const scale = BALL_START.scale + (BALL_END.scale - BALL_START.scale) * eased;
    const x = zoneRect.left + (zoneRect.width * xPct) / 100;
    const y = zoneRect.top + (zoneRect.height * yPct) / 100;
    const radius = (BALL_DIAMETER_AT_END_PX / 2) * scale;
    return { x, y, radius };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!zoneRef.current) return;
    const rect = zoneRef.current.getBoundingClientRect();
    const clampedX = Math.max(rect.left, Math.min(rect.right, e.clientX));
    const clampedY = Math.max(rect.top, Math.min(rect.bottom, e.clientY));
    pointerRef.current = { x: clampedX, y: clampedY };
    // We update React state on move for the crosshair render. Cheap because there's no children.
    setCrosshair({
      x: clampedX - rect.left,
      y: clampedY - rect.top,
    });
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (resolvedRef.current || !zoneRef.current) return;
    const rect = zoneRef.current.getBoundingClientRect();
    // Capture both the move and the press in one event (mouse or first-tap touch).
    const clampedX = Math.max(rect.left, Math.min(rect.right, e.clientX));
    const clampedY = Math.max(rect.top, Math.min(rect.bottom, e.clientY));
    const ball = ballPositionNow(rect);
    const elapsed = Date.now() - startedAtRef.current;
    // Early swing — before the ball is meaningfully in the zone → whiff.
    if (elapsed < PITCH_DURATION_MS * 0.35) {
      resolvedRef.current = true;
      onSwing({ kind: "whiff" });
      return;
    }
    const hit = classifySwing({
      clickX: clampedX,
      clickY: clampedY,
      ballX: ball.x,
      ballY: ball.y,
      ballRadius: ball.radius,
    });
    resolvedRef.current = true;
    if (hit.kind !== "whiff") playCrack();
    onSwing(hit);
  }

  return (
    <div className="mt-6 flex justify-center">
      <div
        ref={zoneRef}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        className="relative h-[320px] w-[320px] cursor-crosshair touch-none rounded-xl border-2 border-dashed border-yellow-300/70 bg-slate-900/30"
      >
        {/* Pitcher mound silhouette (top-center) */}
        <div className="absolute left-1/2 top-2 h-4 w-16 -translate-x-1/2 rounded-full bg-amber-700/60" />
        <div className="absolute left-1/2 top-0 h-6 w-3 -translate-x-1/2 rounded-sm bg-slate-700" />

        {/* The ball — CSS transition for smoothness; position is derived from the timer for click-time calcs */}
        <Ball />

        {/* Crosshair follows pointer */}
        {crosshair && (
          <div
            className="pointer-events-none absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow-300"
            style={{ left: crosshair.x, top: crosshair.y }}
          >
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-300" />
          </div>
        )}
      </div>
    </div>
  );
}

function Ball() {
  // The ball uses a CSS transition from start → end over PITCH_DURATION_MS.
  // We rely on react re-render flow: render once at start values, then on next tick swap to end values.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // requestAnimationFrame ensures the browser registers the initial state before transitioning.
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const xPct = mounted ? BALL_END.xPct : BALL_START.xPct;
  const yPct = mounted ? BALL_END.yPct : BALL_START.yPct;
  const scale = mounted ? BALL_END.scale : BALL_START.scale;
  return (
    <div
      className="pointer-events-none absolute h-14 w-14 rounded-full border-2 border-red-700 bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)]"
      style={{
        left: `${xPct}%`,
        top: `${yPct}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transition: `left ${PITCH_DURATION_MS}ms ease-out, top ${PITCH_DURATION_MS}ms ease-out, transform ${PITCH_DURATION_MS}ms ease-out`,
      }}
    />
  );
}
```

- [ ] **Step 2: Replace the swing-phase dev buttons in `HomeRunDerby.tsx`**

1. Add the import:

```tsx
import { SwingMinigame } from "./SwingMinigame";
```

2. Replace the entire `phase.kind === "swing"` dev-buttons block with:

```tsx
{phase.kind === "swing" && (
  <SwingMinigame onSwing={handleSwingResolved} />
)}
```

3. Remove the "(Gameplay UI for this phase wired in a later task.)" line for the swing phase — it's now superseded.

- [ ] **Step 3: Run typecheck and dev server**

```
npm run typecheck
npm run dev
```

Manual checks:
- Correct answer → ball animates from top to bottom of the zone over ~0.9 s.
- Crosshair tracks the mouse and stays clamped inside the zone.
- Click near the ball's center → outcome shows (placeholder text), HIT result registers.
- Click far from the ball → whiff, strike count increments.
- Don't click → after ~1 s the swing auto-resolves as a whiff.
- Touch on iPad (if available) → tap moves the crosshair and registers the swing in one motion. If this feels unusable, note it for the implementation-deferred decisions in the spec (touch model) and try `onPointerUp` instead of `onPointerDown`.

- [ ] **Step 4: Commit**

```bash
git add src/games/home-run-derby/SwingMinigame.tsx src/games/home-run-derby/HomeRunDerby.tsx
git commit -m "Home Run Derby: swing minigame with crosshair + ball animation"
```

---

## Task 7: Implement `DiamondView.tsx` and wire it into the `outcome` phase

This replaces the placeholder phase-name card with an actual top-down diamond animation showing the hit and runner advancement.

**Files:**
- Create: `src/games/home-run-derby/DiamondView.tsx`
- Modify: `src/games/home-run-derby/HomeRunDerby.tsx`

- [ ] **Step 1: Create `DiamondView.tsx`**

```tsx
import { useEffect, useState } from "react";
import { playCheer } from "@/lib/sounds";
import type { HitResult, Runners } from "./hitMath";

interface Props {
  hit: HitResult;
  runsScored: number;
  // Runners AFTER advancement — DiamondView animates them from their pre-hit positions to here.
  runnersAfter: Runners;
  runnersBefore: Runners;
  /** Was this outcome a strikeout (out)? Distinguishes "OUT" banner from "STRIKE" banner. */
  wasOut: boolean;
}

type Base = "home" | "first" | "second" | "third";

const BASE_POSITION: Record<Base, { left: string; top: string }> = {
  home: { left: "50%", top: "82%" },
  first: { left: "78%", top: "55%" },
  second: { left: "50%", top: "28%" },
  third: { left: "22%", top: "55%" },
};

export function DiamondView({
  hit,
  runsScored,
  runnersAfter,
  runnersBefore,
  wasOut,
}: Props) {
  const [showBall, setShowBall] = useState(false);
  const [showRunners, setShowRunners] = useState(false);

  useEffect(() => {
    if (runsScored > 0) playCheer();
    // Show the ball arc first, then runners after a short delay.
    const t1 = window.setTimeout(() => setShowBall(true), 30);
    const t2 = window.setTimeout(() => setShowRunners(true), 400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [hit, runsScored]);

  const banner = bannerFor(hit, wasOut);
  const landing = landingFor(hit);

  return (
    <div className="mt-6 flex justify-center">
      <div className="relative h-[320px] w-[320px] rounded-3xl bg-green-700 ring-2 ring-green-900">
        {/* Outfield arc */}
        <div className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30" />
        {/* Infield diamond (rotated square) */}
        <div className="absolute left-1/2 top-1/2 h-[130px] w-[130px] -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-white/70 bg-amber-700/70" />
        {/* Bases */}
        {(Object.keys(BASE_POSITION) as Base[]).map((b) => (
          <div
            key={b}
            className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-white"
            style={BASE_POSITION[b]}
          />
        ))}

        {/* Ball: travels from home to landing point */}
        <div
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-700 bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]"
          style={{
            left: showBall ? landing.left : BASE_POSITION.home.left,
            top: showBall ? landing.top : BASE_POSITION.home.top,
            transition: "left 700ms ease-out, top 700ms ease-out",
          }}
        />

        {/* Runners before/after — render dots for each base that is/was occupied. */}
        {renderRunner("first", runnersBefore.first, runnersAfter.first, showRunners)}
        {renderRunner("second", runnersBefore.second, runnersAfter.second, showRunners)}
        {renderRunner("third", runnersBefore.third, runnersAfter.third, showRunners)}

        {/* Banner */}
        <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-md bg-yellow-300 px-3 py-1 text-sm font-extrabold text-slate-900 shadow">
          {banner}
          {runsScored > 0 ? ` +${runsScored}` : ""}
        </div>
      </div>
    </div>
  );
}

function renderRunner(
  base: Base,
  before: boolean,
  after: boolean,
  show: boolean,
) {
  // Three cases worth visualising:
  //   - Stayed: render once on this base.
  //   - Was here, no longer: render once on this base (will fade/move out next animation tick).
  //   - Arrived: render at this base only after the runner animation tick.
  if (!before && !after) return null;
  const visible = before ? true : show;
  if (!visible) return null;
  return (
    <div
      key={base}
      className="pointer-events-none absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-yellow-300 text-xs ring-2 ring-slate-900 transition-all duration-500"
      style={BASE_POSITION[base]}
    >
      🧒
    </div>
  );
}

function bannerFor(hit: HitResult, wasOut: boolean): string {
  if (wasOut) return "OUT";
  switch (hit.kind) {
    case "homerun":
      return "HOME RUN!";
    case "triple":
      return "TRIPLE!";
    case "double":
      return "DOUBLE!";
    case "single":
      return hit.weak ? "WEAK SINGLE" : "SINGLE!";
    case "whiff":
      return "STRIKE!";
  }
}

function landingFor(hit: HitResult): { left: string; top: string } {
  // Land near the appropriate base for a quick visual; HR sails past 2B (top center).
  switch (hit.kind) {
    case "homerun":
      return { left: "50%", top: "8%" };
    case "triple":
      return { left: "20%", top: "20%" };
    case "double":
      return BASE_POSITION.second;
    case "single":
      return { left: "65%", top: "45%" };
    case "whiff":
      return BASE_POSITION.home;
  }
}
```

> Note: This is a deliberately simple visualization. Runners are not animated along arcs (just appear/disappear based on before/after state); the ball is a single dot moving from home to a representative landing spot. The spec calls out animation polish as deferred-to-implementation; iterate later if it feels flat.

- [ ] **Step 2: Track `runnersBefore` and `wasOut` in `HomeRunDerby.tsx`**

The current `Phase` union only carries `hit` and `runsScored` in the `outcome` variant. To render the diamond properly we also need the pre-hit runners and whether the outcome was an out.

In `HomeRunDerby.tsx`:

1. Update the `Phase` type:

```tsx
type Phase =
  | { kind: "intro" }
  | { kind: "pitch" }
  | { kind: "swing"; problem: Problem; startTimeMs: number }
  | {
      kind: "outcome";
      hit: HitResult;
      runsScored: number;
      runnersBefore: Runners;
      runnersAfter: Runners;
      wasOut: boolean;
    }
  | { kind: "between-pitches" }
  | { kind: "done" };
```

2. Update `handleWrongAnswer` — the outcome carries `wasOut` based on whether the 3rd strike was just taken, and runners are unchanged:

```tsx
function handleWrongAnswer(problem: Problem) {
  void problem;
  playWrong();
  setProblemsAttempted((n) => n + 1);
  problemIndexRef.current += 1;
  const newStrikes = strikesThisAB + 1;
  const isOut = newStrikes >= 3;
  if (isOut) {
    setStrikesThisAB(0);
    setOuts((o) => o + 1);
    setHitBreakdown((b) => ({ ...b, strikeout: (b.strikeout ?? 0) + 1 }));
  } else {
    setStrikesThisAB(newStrikes);
  }
  setPhase({
    kind: "outcome",
    hit: { kind: "whiff" },
    runsScored: 0,
    runnersBefore: runners,
    runnersAfter: runners,
    wasOut: isOut,
  });
}
```

3. Update `handleSwingResolved`:

```tsx
function handleSwingResolved(hit: HitResult) {
  problemIndexRef.current += 1;
  setHitBreakdown((b) => ({ ...b, [hit.kind]: (b[hit.kind] ?? 0) + 1 }));
  if (hit.kind === "whiff") {
    const newStrikes = strikesThisAB + 1;
    const isOut = newStrikes >= 3;
    if (isOut) {
      setStrikesThisAB(0);
      setOuts((o) => o + 1);
    } else {
      setStrikesThisAB(newStrikes);
    }
    setPhase({
      kind: "outcome",
      hit,
      runsScored: 0,
      runnersBefore: runners,
      runnersAfter: runners,
      wasOut: isOut,
    });
    return;
  }
  // Fair hit — advance runners.
  const { runners: nextRunners, runsScored } = advanceRunners({
    runners,
    hit,
  });
  setRunners(nextRunners);
  setRuns((r) => r + runsScored);
  setStrikesThisAB(0);
  // After a fair hit, the at-bat is over. If THIS was the 3rd strike-equivalent... it can't be (fair hit = no strike).
  setPhase({
    kind: "outcome",
    hit,
    runsScored,
    runnersBefore: runners,
    runnersAfter: nextRunners,
    wasOut: false,
  });
}
```

4. Replace the placeholder outcome rendering. Add this import:

```tsx
import { DiamondView } from "./DiamondView";
```

5. In the in-game render block, replace the now-stale phase-name placeholder card (the `<p className="text-xs uppercase tracking-wide text-sky-200/60">Phase: ...</p>` debug label and surrounding placeholder) with phase-specific rendering. The final structure should be:

```tsx
{phase.kind === "pitch" && currentProblem && (
  <PitchScreen
    problem={currentProblem}
    onCorrect={() => handleCorrectAnswer(currentProblem)}
    onWrong={() => handleWrongAnswer(currentProblem)}
  />
)}

{phase.kind === "swing" && (
  <SwingMinigame onSwing={handleSwingResolved} />
)}

{phase.kind === "outcome" && (
  <DiamondView
    hit={phase.hit}
    runsScored={phase.runsScored}
    runnersBefore={phase.runnersBefore}
    runnersAfter={phase.runnersAfter}
    wasOut={phase.wasOut}
  />
)}

{phase.kind === "between-pitches" && (
  <div className="mt-6 text-center text-sky-200/60">Next pitch...</div>
)}
```

6. Update the HUD header to use the kid's avatar / icon if you wish; otherwise leave the strike/out/runs badges as written in Task 4. Also update the runners HUD chip to reflect occupied bases — append this to the HUD chips row:

```tsx
<span className="rounded-full bg-amber-400/30 px-3 py-1 font-mono">
  {runners.first ? "●" : "○"}
  {runners.second ? "●" : "○"}
  {runners.third ? "●" : "○"}
</span>
```

- [ ] **Step 3: Run typecheck and dev server**

```
npm run typecheck
npm run dev
```

Manual checks:
- Hit a HR (click ball center) → "HOME RUN!" banner, ball sails to top, runs increments.
- Hit a single → "SINGLE!" banner, ball lands near 1B, runner appears on 1B for the next at-bat.
- Strike out (3 wrong answers) → "OUT" banner appears, OUTS HUD increments.
- Multi-pitch at-bat with runner on 2B + single → "+1" appears on the banner.
- Weak single (click on the ball edge) with runner on 2B → "+0", runner shows up on 3B for next at-bat.

- [ ] **Step 4: Commit**

```bash
git add src/games/home-run-derby/DiamondView.tsx src/games/home-run-derby/HomeRunDerby.tsx
git commit -m "Home Run Derby: diamond view with ball arc, runners, banner"
```

---

## Task 8: Register the game and wire it into `App.tsx`

**Files:**
- Modify: `src/lib/games-registry.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Append the new `GameDef` to `GAMES` in `games-registry.ts`**

In `src/lib/games-registry.ts`, append a new entry inside the `GAMES` array (insert before the `word-scramble` entry to keep "problems"-consuming games grouped together):

```ts
{
  id: "home-run-derby",
  name: "Home Run Derby",
  icon: "⚾",
  description: "Answer to swing — perfect timing for a homer!",
  consumes: "problems",
  supportedFormats: ["multiple-choice", "numeric", "true-false"],
  minProblemsToPlay: 6,
},
```

- [ ] **Step 2: Wire `HomeRunDerby` into `App.tsx`**

1. Add the import alongside the other game imports:

```tsx
import { HomeRunDerby } from "@/games/home-run-derby";
```

2. In the `playing-problem` switch block (the chain of `if (view.gameId === "...") return <... />` lines), add this BEFORE the final `return <QuizShowdown {...common} />;` fallback:

```tsx
if (view.gameId === "home-run-derby") return <HomeRunDerby {...common} />;
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/games-registry.ts src/App.tsx
git commit -m "Home Run Derby: register game and wire into App"
```

---

## Task 9: End-to-end manual verification

This task has no code changes — just verify the game is shippable. If any check fails, file a follow-up task or fix and commit a small patch.

**Files:** none (verification only)

- [ ] **Step 1: Run the full test + typecheck + build**

```
npm run test
npm run typecheck
npm run build
```

Expected: all three exit 0. `npm run build` produces a `dist/` bundle.

- [ ] **Step 2: Run the dev server and walk both profiles**

```
npm run dev
```

For the **4th-grade profile** with a multiplication-facts set:

1. Home Run Derby appears as a game card on the Home screen.
2. Tap it → intro screen → "Play ball!".
3. First pitch shows a real multiplication problem.
4. Answer wrong on the first pitch — STRIKES goes to 1, next problem appears.
5. Answer correctly on the next — ball animates in, crosshair tracks the mouse.
6. Click dead-center on the ball — HOME RUN! banner, RUNS = 1.
7. Continue at-bats; verify singles, doubles, etc., based on click accuracy.
8. Strike out at least once (3 wrongs in a row) — OUT banner, OUTS = 1.
9. Reach end of set OR 3 outs — outro screen shows runs + accuracy + hit breakdown.
10. Back to home — streak/daily-progress meter reflects the session.

For the **1st-grade profile** with an addition set:

11. Same flow with addition problems. Verify the game card appears (the set should have ≥ 6 problems).
12. Verify the answer UI works for whatever format the 1st-grade content uses (MC for most sets).

- [ ] **Step 3: iPad smoke test (if available)**

Open the dev server URL on an iPad (or use Chrome devtools' touch simulation). Verify:
- Tap-to-swing registers on the first touch.
- Crosshair follows the touch position.
- No accidental scroll/zoom triggers from the swing-zone (the `touch-none` Tailwind class should prevent this; verify it works).

If touch feels unusable, the spec's "deferred-to-implementation touch model" decision is now in scope — try moving the swing trigger from `onPointerDown` to `onPointerUp` in `SwingMinigame.tsx` and re-test.

- [ ] **Step 4: Commit if any verification fixes were made; otherwise no commit.**

If fixes were necessary:

```bash
git add <files>
git commit -m "Home Run Derby: fixes from manual playthrough"
```

---

## Done!

The game ships when Task 9 passes. Final checklist:
- All 8 prior tasks committed.
- `npm run test` green (covers `hitMath`).
- `npm run typecheck` and `npm run build` green.
- Manual playthrough succeeded on both kid profiles.
- iPad touch verified (or noted as a follow-up).
