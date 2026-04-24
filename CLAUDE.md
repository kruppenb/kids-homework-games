# Project: Kids Homework Games

Learning games for my 1st and 4th grader — nightly practice on school subjects (math first, others as needed).

See `PLAN.md` for full roadmap and data model.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS
- Zod for runtime content validation
- nanoid for IDs
- Static site, deployed to GitHub Pages

## Commands

```bash
npm run dev        # Dev server on :5173
npm run build      # Production build
npm run preview    # Preview production build
npm run typecheck  # tsc --noEmit
```

## Architecture

- Hash-based routing for GitHub Pages (`/#/play/<set-id>`)
- No backend. All state in localStorage under `khg:*` keys, namespaced per kid profile.
- Content is JSON in `public/content/<subject>/<grade>/*.json`, loaded on demand, validated with zod.
- Each game declares `supportedFormats` and `minProblemsToPlay`. Landing page filters games by what the loaded content supports.

## Key Patterns

- Kid profile selection on first launch, stored at `khg:activeProfile`. Switchable from header.
- Per-profile progress: `khg:sessions:<profileId>`, `khg:daily:<profileId>`.
- Daily-goal + streak loop drives engagement. See `src/lib/streaks.ts`.
- `Problem` is a discriminated union on `format`. Games render based on the variant.
- Content is grade-banded, not difficulty-tagged. Grade is a property of the `ProblemSet`, not per-problem.

## Relation to church-games

`church-games` (C:\repos\church-games) is a separate, working project with a similar tech stack. Some game designs (Quiz Showdown, Jeopardy, Millionaire, etc.) are copied here and adapted — but the schemas, UX, audience, and branding are independent. No shared code or shared repo. Backport fixes manually if both ever need the same change.

## Non-Goals

- Not a generic "learning platform". Only kid-homework use case.
- No content-authoring UI (JSON generated out-of-band).
- No cross-device sync, no leaderboards, no sibling competition.

## Testing

- Acceptance test is kids playing on an iPad. No full e2e harness yet.
- `npm run build` + manual playthrough before shipping each phase.
- Add Vitest unit tests for `lib/` pure functions (`streaks.ts`, `problem-pool.ts`) as those grow.
