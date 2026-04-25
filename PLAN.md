# Kids Homework Games

Learning games site for my 1st and 4th grader — small nightly sessions on subjects they're struggling with at school (math first, other subjects as needed).

## Context

My kids need motivation to practice math. I already have `church-games` (Bible lesson games for Sunday school) that works well as a pattern, but its content schema, audience, and game roster are church-specific enough that retrofitting it into a generic engine would be over-engineering. Instead: **build a sibling product**, copy game designs where useful, diverge where audience demands it.

Key constraints:
- Two kids, two grade bands (1st and 4th), possibly multiple subjects.
- Nightly sessions are small (~5–10 problems), not 30+ like a Sunday lesson.
- Encouragement loop matters — streaks, daily goals, visible progress.
- Content authoring pipeline will come separately (user handles JSON generation out-of-band).
- This is NOT a generic learning platform. It's one kid-homework product. If a third audience shows up later and shares enough game code, *then* extract a shared lib.

## Architecture

**Stack**: Vite + React 19 + TypeScript + Tailwind CSS. Static site. GitHub Pages deploy.

**No backend**. All state in localStorage, namespaced per kid profile.

**Routing**: Hash-based (GitHub Pages compatible), same pattern as church-games.

**Content**: JSON files in `public/content/<subject>/<grade>/*.json`. Loaded on demand by game.

**Code splitting**: `React.lazy()` per game route.

## Data Model

All state lives in localStorage under `khg:*` keys (short for kids-homework-games — avoids collision with other apps on the same origin).

### Kid Profile

```ts
type Grade = "1" | "2" | "3" | "4" | "5";

interface KidProfile {
  id: string;           // nanoid
  name: string;
  grade: Grade;
  avatar: string;       // emoji or preset key
  createdAt: number;
}
```

Stored at `khg:profiles` as `KidProfile[]`. Active profile id at `khg:activeProfile`.

### Content Schema

A content "set" is one bite-sized unit (5–10 problems) that a kid can complete in one sitting.

```ts
type Subject = "math" | "spelling" | "reading" | "vocab";

type QuestionFormat =
  | "multiple-choice"
  | "numeric"
  | "fill-blank"
  | "true-false";

interface ProblemSet {
  id: string;
  subject: Subject;
  grade: Grade;
  title: string;              // "4th grade multiplication facts"
  topic?: string;              // "multiplication", "fractions", etc.
  problems: Problem[];
}

type Problem =
  | MultipleChoiceProblem
  | NumericProblem
  | FillBlankProblem
  | TrueFalseProblem;

interface BaseProblem {
  id: string;
  prompt: string;              // "What is 7 × 8?" or "Spell: elephant"
  explanation?: string;        // Shown after answer
  hint?: string;
}

interface MultipleChoiceProblem extends BaseProblem {
  format: "multiple-choice";
  options: string[];           // 2–4 options
  correctIndex: number;
}

interface NumericProblem extends BaseProblem {
  format: "numeric";
  answer: number;
  tolerance?: number;          // For decimals/fractions if ever needed
}

interface FillBlankProblem extends BaseProblem {
  format: "fill-blank";
  answer: string;              // Case-insensitive compare
  acceptableAnswers?: string[]; // Optional extras (synonyms)
}

interface TrueFalseProblem extends BaseProblem {
  format: "true-false";
  answer: boolean;
}
```

### Game Compatibility

Each game declares what formats it supports. At load time, filter problem sets → show only the games that can render them.

```ts
interface GameDef {
  id: string;
  name: string;
  route: string;
  icon: string;
  supportedFormats: QuestionFormat[];
  minProblemsToPlay: number;   // e.g., Jeopardy needs >= 15 for a full board
}
```

### Progress Tracking

```ts
interface SessionResult {
  profileId: string;
  setId: string;
  gameId: string;
  completedAt: number;         // epoch ms
  problemsAttempted: number;
  problemsCorrect: number;
  durationMs: number;
}
```

Stored at `khg:sessions:<profileId>` as `SessionResult[]` (capped at last 500).

### Streak + Goal

```ts
interface DailyProgress {
  profileId: string;
  date: string;                // YYYY-MM-DD local
  problemsCompleted: number;
  goalMet: boolean;
}
```

Stored at `khg:daily:<profileId>` as `DailyProgress[]` (last 60 days).

- Daily goal: configurable per profile, default 10 problems.
- Streak = consecutive days with `goalMet: true`, ending today or yesterday.

## Directory Structure

```
C:\repos\kids-homework-games\
  package.json
  tsconfig.json
  vite.config.ts
  tailwind.config.ts
  postcss.config.js
  index.html
  CLAUDE.md
  PLAN.md
  public/
    content/
      math/
        grade-1/
          addition-within-10.json
        grade-4/
          multiplication-facts.json
  src/
    main.tsx
    App.tsx
    index.css
    types/
      content.ts              # ProblemSet, Problem, Subject, etc.
      profile.ts              # KidProfile, DailyProgress, SessionResult
    lib/
      storage.ts              # Typed localStorage wrappers, namespaced keys
      content-loader.ts       # Fetch + parse + validate problem sets
      problem-pool.ts         # Shuffle + consume without repeats
      streaks.ts              # Compute streak, daily progress
      games-registry.ts       # All GameDef entries
    hooks/
      useActiveProfile.ts
      useProblemSet.ts
      useDailyProgress.ts
    components/
      ProfilePicker.tsx       # First-launch + switch flow
      Home.tsx                # Landing: streak, daily goal, game picker
      StreakBadge.tsx
      DailyGoalMeter.tsx
      GameCard.tsx
      ResultScreen.tsx        # Post-game: score, explanation, next-up
    games/
      quiz-showdown/
        QuizShowdown.tsx
        index.ts
      # more games added in later phases
```

## Implementation Phases

### Phase 0: Scaffold + minimum playable slice (build by hand)

Goal: one kid can pick their profile, play one math set in one game, see their score and streak.

**0.1 — Project init** ✅ (Vite scaffold done)
- Vite + React + TS template
- Install: `tailwindcss`, `postcss`, `autoprefixer`, `nanoid`, `zod`
- Wire up Tailwind
- Write `CLAUDE.md` and `PLAN.md` (this doc)

**0.2 — Types + storage layer**
- `src/types/content.ts`, `src/types/profile.ts` per the schemas above
- `src/lib/storage.ts` — typed `get<T>(key)`, `set<T>(key, val)`, namespaced helpers
- Zod schemas alongside types for content-loader validation

**0.3 — Kid profile flow**
- `ProfilePicker.tsx` — first launch creates a profile (name, grade, avatar); subsequent launches show picker with "switch kid" button
- `useActiveProfile.ts` hook — reads/writes `khg:activeProfile`
- Route `/#/` → if no active profile, show picker; else show Home

**0.4 — Content loader**
- `content-loader.ts` — fetch `/content/<subject>/<grade>/<set-id>.json`, validate with zod, return typed `ProblemSet`
- Sample content files: one 4th grade multiplication set (10 problems, mix of MC and numeric), one 1st grade addition set (10 problems, all MC)
- Manifest file `public/content/index.json` listing available sets per subject/grade

**0.5 — First game: Quiz Showdown**
- `games/quiz-showdown/QuizShowdown.tsx` — timed MC + numeric rounds, Kahoot-style feedback
- Adapted from church-games version but operates on the new `Problem` union
- Records a `SessionResult` on completion
- Shows result screen with score + explanations

**0.6 — Home + streak/goal loop**
- `Home.tsx` — greets active kid by name, shows streak badge, daily-goal meter, game cards filtered by loaded sets' formats
- `streaks.ts` — compute current streak, today's progress
- `DailyGoalMeter.tsx` — "3 of 10 today"
- Updates `DailyProgress` when a session completes

**0.7 — Deploy**
- GitHub repo, GitHub Pages config
- Deploy script: `npm run build && gh-pages -d dist` or GitHub Actions workflow
- Verify on live URL with both kid profiles

**Phase 0 done when**: 4th grader can open the site on their device, pick their profile, play a math set of Quiz Showdown end-to-end, see today's-goal progress update, and close the tab. Same for 1st grader with an addition set.

### Phase 1: Second game + 1st-grader path ✅

Goal: more variety, make sure the content loader + game compat matrix actually works across subjects/grades.

**1.1 — Speed Run** ✅ (replaced original Jeopardy plan — Jeopardy needs category metadata that math content doesn't naturally provide)
- Timer per problem (12s), combo multiplier (1×, 2×, 3×, …) on consecutive correct
- Wrong/timeout breaks combo. Score = sum of (basePoints × combo at time of answer)
- Tuned for fluency drilling — 4th grader audience

**1.2 — Tower Builder** ✅
- Each correct answer adds a colored block to a visual tower
- No timer. Friendlier for 1st grader.
- Both games support MC, numeric, true/false formats

**1.3 — More content sets** ✅
- 4th grade: multi-digit subtraction, fractions intro (added to existing multiplication facts)
- 1st grade: subtraction within 10, mixed add/sub (added to existing addition)
- Total: 6 sets at Phase 1 close

**1.4 — Sound effects** ✅
- WebAudio-based correct/wrong/level-up tones in `lib/sounds.ts`
- Mute toggle on Home, persisted in localStorage at `khg:muted`

### Phase 2: Encouragement loop ✅

Goal: kids open the site *without being asked* because the loop is engaging.

**2.1 — Streak heatmap** ✅ — Last 14 days as 2 weeks × 7 days grid on Home. Color-coded by goal-met vs partial vs idle.
**2.2 — Per-subject progress** ✅ — `Your progress` panel on Home aggregates sessions by topic, shows accuracy badge + last-played.
**2.3 — Weekly summary** — *Subsumed into 2.2.* The TopicStats panel already gives parent-visible summary.
**2.4 — Avatar unlocks** ✅ — 6 bonus avatars unlock at streak milestones (3, 7, 14, 30, 50, 100 days). Banner notification on cross-threshold. AvatarPickerModal opened from header avatar tap.

### Phase 3: Game library expansion ✅

Goal: rough parity with the church-games roster of 9 games. Pure-React ports — no Phaser, to keep bundle small and simple.

**3.1 — WordSet content type** ✅ — new `WordSet` shape (`{words: [{word, hint}]}`), manifest entries gain `kind: "problems" | "words"` discriminator, content-loader has a `loadWordSet` path. Sample vocab content shipped for grades 1 and 4.
**3.2 — Word Scramble** ✅ — letter unscramble with deterministic per-word scramble + hint button.
**3.3 — Jeopardy** ✅ — 5-category × 3-value board (uses up to 5 ProblemSets as categories). `multiSet: true` flag on the game; App loads all matching sets.
**3.4 — Millionaire** ✅ — 10-level money ladder ($100 → $1,000,000) with two safe havens ($1k, $50k) and walk-away option.
**3.5 — Math Defense** ✅ — wave-based React tower defense (3 waves, 5 enemies/wave, 5 HP). Enemies advance on a 1.3s timer, correct answer defeats the current enemy.
**3.6 — Match Master** ✅ — 4×3 memory grid pairing problem prompts to their answers.

**Skipped from church-games**: Promised Land (Phaser RPG), Survivors (Phaser auto-battler), Faith Fortress / Scripture Cards / Kingdom Match (heavy Phaser ports). The five above cover the gameplay variety without the Phaser dependency.

### Phase 4+: Expand as real needs surface

Don't build speculatively. When a kid is struggling with X at school, add content for X and whatever game best supports it.

Candidates:
- Spelling subject content (already supported via WordSet)
- Reading comprehension (MC on short passages)
- Pull in Phaser-style games (Survivors, Quest) only if existing roster gets stale

## Verification

**Phase 0 smoke test**:
1. Open dev server. No active profile → picker shown.
2. Create profile "4th-grader-kid", grade 4. Redirect to Home.
3. Home shows 1 game (Quiz Showdown) and 1 available set (4th grade multiplication).
4. Play the set through. Answer correctly on half, wrong on half.
5. Result screen shows 5/10 with explanations. Daily goal meter shows 10/10 (or whatever was configured).
6. Back to Home → streak = 1 (just met goal today).
7. Switch profile → create "1st-grader-kid", grade 1.
8. Home shows only the 1st grade addition set.
9. Play that set, confirm problems are age-appropriate and work end-to-end.
10. Build production bundle (`npm run build`), serve, re-run steps 1–9.

**Every phase**:
- `npm run build` passes.
- Manual playthrough by the actual kids on an iPad — they are the acceptance test.
- Playthrough with both profiles to catch per-profile bugs.

**Not doing (explicit non-goals)**:
- No backend, no sync across devices. Each device is its own world.
- No content-authoring UI. JSON is hand-authored or generated out-of-band.
- No generic "platform" abstractions — `ContentPack` interface, pack registry, theme tokens, multi-subject runtime picker. Only add if third audience appears.
- No cross-kid leaderboard or comparison. Avoid turning siblings into competitors.
