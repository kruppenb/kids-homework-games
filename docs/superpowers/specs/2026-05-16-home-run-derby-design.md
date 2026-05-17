# Home Run Derby — Design

**Date:** 2026-05-16
**Status:** Spec, awaiting implementation plan
**Owner:** Nicholas

## Summary

A new game in the kids-homework-games roster. Kid plays as a batter. Each math problem is one pitch. Wrong answer = strike. Correct answer triggers a click-timing swing minigame: the ball flies in from the pitcher and the kid must click a sweet-spot crosshair while the ball is in the strike zone. The camera then cuts to a top-down diamond view where the ball arcs to its landing spot, runners advance, and runs score. Bat until the problem set runs out or 3 outs accumulate.

The game keeps the codebase pattern: a single `ProblemSet` in, a `SessionResult` out, no new content schema, no backend.

## Goals

- Add a baseball-themed game that fits the existing nightly-practice loop (~5–10 problems, finishes in a few minutes).
- Layer a satisfying timing/aim minigame on top of math without making the math itself timed.
- Reuse existing infrastructure (`Problem` discriminated union, `isAnswerCorrect`, `playCorrect`/`playWrong`, `SessionResult`, hash routing, game registry) — no new abstractions.

## Non-goals (v1)

- No walks, no balls, no foul balls, no taking a pitch (the kid never gets a "skip" option — every problem is attempted).
- No timer on the math problem. The kid reads and answers at their own pace.
- No CPU opponent, no innings, no opposing team scoring.
- No pitch variety (fastball/curve/changeup). One pitch animation always.
- No animated fielders.
- No save-and-resume mid-game.
- No new sound infrastructure beyond two small additions in `lib/sounds.ts`.
- No `WordSet` content support — math/quiz problems only.

## Naming

Working name: **Home Run Derby**. Game `id`: `home-run-derby`. Icon: ⚾.

Alternatives considered but not chosen: "Slugger", "Batter Up", "Big Hit". If a name change is preferred during implementation, the `id` is the only string that has cross-cutting impact (App routing switch + registry + folder name).

## Gameplay

### At-bat loop

1. **Pitch screen** — batter-view backdrop (sky + grass + distant pitcher/mound). The current math problem renders in a card at the top; the answer UI (MC buttons / number pad / T-F buttons depending on problem format) renders at the bottom. **No ball is visible yet.** No timer. The kid reads and answers at their own pace.
2. **On wrong answer:** record a strike (+1 to `strikesThisAB`). Brief flash feedback ("STRIKE"). If `strikesThisAB == 3` → record an out (+1 to `outs`), reset `strikesThisAB`, advance to the next at-bat (next pitch screen). Otherwise advance to the next pitch (same at-bat, same runners).
3. **On correct answer:** transition to the swing minigame.

### Swing minigame

- The ball appears small at the pitcher's mound (distant) and scales up over ~900 ms while translating toward the camera, ending inside the strike-zone box centered in the lower-middle of the view.
- A yellow crosshair sweet-spot (~36 px ring) tracks the mouse (or touch) position, clamped to the strike-zone bounds.
- The kid clicks (or taps-and-releases) to swing. The swing fires as soon as the click is registered.
- If the click happens *before* the ball enters the strike zone (early swing) or the ball passes through with no click (no swing) — the swing is treated as a **whiff** = strike.
- If the click is registered while the ball is in the strike zone, compute hit quality (see Hit quality table) based on the distance between the click and the ball's current center.
- A whiff increments `strikesThisAB`. 3 strikes → out, advance to next at-bat. Otherwise the next pitch (same at-bat, same runners) follows.

### Hit quality

Let `d` = distance between click position and ball center at click-time, normalized to ball radius (so `d = 0` is a dead-center hit; `d = 1` is the click landing exactly on the ball's edge).

| Click accuracy (`d`)      | Result            |
|---------------------------|-------------------|
| 0.00 – 0.15               | Home run (4 bases) |
| 0.15 – 0.35               | Triple (3 bases)  |
| 0.35 – 0.60               | Double (2 bases)  |
| 0.60 – 0.85               | Single (1 base)   |
| 0.85 – 1.00               | Weak single (1 base; runners from 2nd do not score, see Runners) |
| > 1.00 (click outside ball) | Whiff = strike  |

The horizontal click offset from the ball center (measured in ball-radius units) decides the diamond field direction: `|dx| < 0.3` → center field, `dx ≤ -0.3` → left field, `dx ≥ 0.3` → right field. This is purely cosmetic — base count is not affected.

### Runners and scoring

Per-at-bat state: `runners: { first: boolean; second: boolean; third: boolean }`.

On a hit of `N` bases:
- The batter is placed on base `N` (or scores if `N == 4`).
- Every existing runner advances `N` bases.
- Any runner whose new base is > 3 scores (+1 to `runs`).
- **Exception:** on a "Weak single", a runner on second base advances only to third (does not score). All other advances are normal.

On a strikeout (out), runners stay where they are.

Score = total `runs` accumulated. Displayed on the diamond view HUD and on the outro screen.

### End conditions

The game ends as soon as either condition is met:
1. The `ProblemSet`'s problems are exhausted (after running out, even mid-at-bat, finish the current pitch's resolution and then go to outro).
2. `outs == 3`.

There is no walk-off / extra innings logic. Whichever ends first ends the game.

## Components

```
src/games/home-run-derby/
  HomeRunDerby.tsx        # main: phase machine, runner/score state, completion fire
  PitchScreen.tsx         # batter view + problem card + answer UI
  SwingMinigame.tsx       # crosshair + ball animation + click handler
  DiamondView.tsx         # top-down field, ball arc, runner animations, banner
  IntroScreen.tsx         # rules + Play button (mirror MathDefense intro pattern)
  OutroScreen.tsx         # final runs, accuracy breakdown, Play again / Back
  hitMath.ts              # pure: click+ball → HitResult; runner advancement
  index.ts                # export { HomeRunDerby }
```

`HomeRunDerby.tsx` follows the established game-component shape:
- Props: `{ set: ProblemSet, profileId: string, onExit: () => void, onComplete: (r: SessionResult) => void }`.
- Uses `shuffle(set.problems)` once on mount.
- `isAnswerCorrect(problem, given)` to grade.
- Completion fires exactly once via a `useEffect` watching `phase.kind === "done"` and a `completedRef` boolean to guard against duplicate fires (same pattern as `MathDefense.tsx:124-137`).

## Phase state machine

```ts
type HitResult =
  | { kind: "homerun" }
  | { kind: "triple" }
  | { kind: "double" }
  | { kind: "single"; weak: boolean }
  | { kind: "whiff" }; // treated as strike at the HomeRunDerby level

type Phase =
  | { kind: "intro" }
  | { kind: "pitch" }                                  // problem visible, awaiting answer
  | { kind: "swing"; problem: Problem; startTimeMs: number } // ball flying, awaiting click
  | { kind: "outcome"; hit: HitResult; runsScored: number }  // diamond animation playing
  | { kind: "between-pitches" }                         // ~700ms pause after outcome
  | { kind: "done" };
```

Top-level state (outside `phase`):
- `runs: number`
- `outs: number`
- `strikesThisAB: number`
- `runners: { first: boolean; second: boolean; third: boolean }`
- `problemIndex: number` (incremented when an at-bat ends or on a strike-but-not-out; advances regardless of correctness, matching other games)
- `problemsAttempted: number`, `problemsCorrect: number` (for `SessionResult`)
- `hitBreakdown: Record<HitResult["kind"], number>` (for the outro screen)

`problemIndex` advances on every pitch attempt (right or wrong). If the set runs out and `phase` is `between-pitches`, transition to `done` instead of `pitch`.

## Visual design

Same palette as the mockup the user approved:
- Sky: `linear-gradient(#7ec4ff, #bde0ff)`
- Field: `linear-gradient(#3a8c3a, #2a6c2a)`
- Dirt/mound: `#8b6914`
- Strike zone: dashed `#ff0` (yellow), low opacity
- Sweet-spot crosshair: solid `#ff4` ring
- Ball: white fill, `#c00` border, white glow
- HUD chips: `rgba(0,0,0,.4)` background, monospace, white text

### Pitch screen layout (behind-batter)

- Full-viewport background (sky + field).
- HUD top-left: `STRIKES <n>  OUTS <m>  RUNS <r>`.
- HUD top-right: a small base diagram showing which bases are occupied.
- Problem prompt card centered upper area, ~70% viewport width, white-on-dark for legibility.
- Answer UI bottom 40% of viewport:
  - MC: 2x2 button grid (or 2x1 if only 2 options), large tap targets.
  - Numeric: number pad (0-9, clear, enter), with a display showing typed digits.
  - True/false: two big buttons (TRUE / FALSE).

### Swing minigame layout

Same backdrop. Problem card hides (or fades to small/passive). Strike zone box becomes prominent (dashed yellow, ~30% width, ~25% height, centered around y=60%). Pitcher silhouette + mound visible top-center. Ball animation:
- Start: `x=50%, y=45%`, scale `0.2`, opacity `0.6`.
- End: `x=50%, y=60%` (passes through strike zone center), scale `1.0`, opacity `1.0`.
- Duration: `900 ms`, ease-out.
- After the ball passes through (end of animation), if no click occurred, the swing is auto-resolved as a whiff.

Crosshair tracks mouse/touch position via `onMouseMove` / `onTouchMove` on the strike-zone container, clamped to its bounds. Position stored in a ref to avoid re-rendering on every move.

Click handler reads:
- crosshair position at click time
- ball position at click time (computed from `Date.now() - startTimeMs` and the known animation curve)
- distance → hit quality (see `hitMath.ts`)

### Diamond view layout

Replaces the pitch screen for ~1.8 s, then transitions to `between-pitches`.

- Top-down SVG, viewport ~80% width, ~70% height, centered.
- Outfield: faint white arc (semi-circle).
- Infield: brown rotated square.
- Bases: 4 white squares at home (bottom), 1st (right), 2nd (top), 3rd (left).
- Ball trajectory: SVG path from home base to landing-point (calculated from hit type and field direction), drawn as a dashed line with the ball as a moving dot. Duration ~700 ms.
- Runners: emoji avatars (`🧒` or the kid's current avatar from `useActiveProfile`) at their pre-hit base positions. After the ball animation, each runner slides along straight-line paths to their post-hit position over ~500 ms per leg.
- Banner: top-center, large bold text:
  - `HOME RUN!` `TRIPLE!` `DOUBLE!` `SINGLE!` `OUT` (strikeout) `STRIKE!` (whiff that's not out 3)
  - Yellow background, black text, persists for ~1.5 s.

## Touch / mouse support

The acceptance hardware is an iPad. The crosshair tracks both pointer and touch:
- `onPointerMove` (covers mouse + touch on modern browsers) updates the crosshair position ref.
- `onPointerDown` (or `onPointerUp` — pick whichever feels less laggy in testing) registers the swing.

Click position is captured from the same event that fires the swing, so a one-finger tap on iPad both moves the crosshair *and* swings in a single touch — this needs verification during implementation that the touch interaction feels reasonable (it may need a "hold to aim, release to swing" model instead of "tap to swing"). Implementation can decide and iterate.

## Sound

Reuse from `lib/sounds.ts`:
- `playCorrect()` — on correct answer (before the pitch animation starts)
- `playWrong()` — on wrong answer (strike)

Add two new helpers in `lib/sounds.ts`:
- `playCrack()` — short sharp percussive tone (sawtooth, ~70 ms, ~600 Hz) for bat-on-ball.
- `playCheer()` — rising 3-tone chord for HR or any hit that scores a run.

All respect the existing `khg:muted` flag via `isMuted()`.

## Persistence

Standard `SessionResult` fired once on `phase.kind === "done"`:

```ts
onComplete({
  profileId,
  setId: set.id,
  gameId: "home-run-derby",
  completedAt: Date.now(),
  problemsAttempted: problemsAttempted,
  problemsCorrect: problemsCorrect,
  durationMs: Date.now() - startedAt,
});
```

Runs scored is shown on the outro screen but not persisted. Matches the existing pattern where in-game scores (Quiz Showdown points, Millionaire money, Math Defense waves) aren't part of `SessionResult` — only accuracy is, because that's what `TopicStats` aggregates.

## Pure logic: `hitMath.ts`

Pure functions, easy to unit-test (matches the codebase's preference per `CLAUDE.md` testing notes):

```ts
export type HitResult = /* as above */;

export function classifySwing(args: {
  clickX: number; clickY: number;
  ballX: number; ballY: number; ballRadius: number;
}): HitResult;

export interface Runners { first: boolean; second: boolean; third: boolean }

export function advanceRunners(args: {
  runners: Runners;
  hit: HitResult;
}): { runners: Runners; runsScored: number };
```

These two functions encapsulate all the gameplay math. `HomeRunDerby.tsx` calls them; `DiamondView.tsx` reads the resulting runner state for animation.

## Registry & wiring

`src/lib/games-registry.ts`:

```ts
{
  id: "home-run-derby",
  name: "Home Run Derby",
  icon: "⚾",
  description: "Answer to swing — perfect timing for a homer!",
  consumes: "problems",
  supportedFormats: ["multiple-choice", "numeric", "true-false"],
  minProblemsToPlay: 6,
}
```

`minProblemsToPlay: 6` so a 5-problem set isn't offered (you'd never plausibly score with 5 problems and 3-out cap). The 6 figure is a soft floor — real sets are 10+.

`src/App.tsx` — add to the imports and the gameId switch:
```ts
import { HomeRunDerby } from "@/games/home-run-derby";
// ...
if (view.gameId === "home-run-derby") return <HomeRunDerby {...common} />;
```

No changes to content files, content loader, profile flow, streak/goal logic, or topic stats.

## Verification

Manual playthrough on the dev server with both kid profiles, both content kinds (1st grade addition, 4th grade multiplication):

1. Game appears as an option on the Home screen when a compatible set is loaded.
2. Intro screen: rules visible, Play button starts the game.
3. First pitch: problem readable, answer UI works for the set's format.
4. Wrong answer: strike count goes up, brief feedback, next problem.
5. Correct answer: swing minigame loads, ball animates in, crosshair tracks mouse.
6. Click a HR-quality swing: HR banner, diamond animation shows ball clearing the outfield, runner scores, RUNS goes up.
7. Click a single: ball lands in the infield, batter avatar slides to 1B.
8. Multi-hit at-bat: with a runner on 2B, a single scores 1 run (or 0 on weak single).
9. 3 wrong in one at-bat: OUT, runners stay put, OUTS goes up.
10. 3 OUTs total: outro screen with runs + accuracy.
11. ProblemSet exhausted before 3 outs: outro screen fires correctly.
12. `npm run build` succeeds. `npm run typecheck` clean.
13. iPad smoke test: touch crosshair feels usable, tap-to-swing registers.

## Open questions deferred to implementation

These are minor and easier to settle by trying than by spec'ing:

- **Touch model** — tap-to-swing vs. drag-to-aim-release-to-swing. Pick whichever feels responsive on iPad. If both feel bad, fall back to a static crosshair you slide with one finger and a separate big "SWING" button.
- **Ball animation polish** — easing curve, exact duration, whether to show a brief "wind-up" pitcher silhouette frame. Tune in browser; don't pre-spec.
- **Whiff handling for clicks before the ball is in the strike zone** — current spec says "early swing = whiff". Could instead lock out clicks until the ball is in the zone. Pick during implementation; the simpler one wins.
- **Avatar on the diamond** — does the active kid's avatar show up as the batter/runner? If trivial to wire from `useActiveProfile`, do it; otherwise just use `🧒`.

These are implementation-level decisions, not design changes — the rules and shape above don't depend on which way they go.
