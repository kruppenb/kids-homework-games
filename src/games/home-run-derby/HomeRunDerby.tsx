import { useEffect, useMemo, useRef, useState } from "react";
import type { Problem, ProblemSet } from "@/types/content";
import type { SessionResult } from "@/types/profile";
import { shuffle } from "@/lib/problem-pool";
import { playCorrect, playWrong } from "@/lib/sounds";
import {
  advanceRunners,
  type HitResult,
  type Runners,
} from "./hitMath";
import { DiamondView } from "./DiamondView";
import { PitchScreen } from "./PitchScreen";
import { SwingMinigame } from "./SwingMinigame";
import { WindUp } from "./WindUp";

const EMPTY_RUNNERS: Runners = { first: false, second: false, third: false };

type Phase =
  | { kind: "intro" }
  | { kind: "pitch" }
  | { kind: "wind-up"; problem: Problem }
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

  function handleCorrectAnswer(problem: Problem) {
    playCorrect();
    setProblemsAttempted((n) => n + 1);
    setProblemsCorrect((n) => n + 1);
    setPhase({ kind: "wind-up", problem });
  }

  function handleSwingResolved(hit: HitResult) {
    problemIndexRef.current += 1;
    if (hit.kind === "whiff") {
      const newStrikes = strikesThisAB + 1;
      const isOut = newStrikes >= 3;
      if (isOut) {
        setStrikesThisAB(0);
        setOuts((o) => o + 1);
      } else {
        setStrikesThisAB(newStrikes);
      }
      // Count a 3rd-strike whiff as a strikeout for the outro summary; a non-out
      // whiff is just a missed swing and doesn't need its own bucket.
      if (isOut) {
        setHitBreakdown((b) => ({ ...b, strikeout: (b.strikeout ?? 0) + 1 }));
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
    setHitBreakdown((b) => ({ ...b, [hit.kind]: (b[hit.kind] ?? 0) + 1 }));
    const { runners: nextRunners, runsScored } = advanceRunners({
      runners,
      hit,
    });
    setRunners(nextRunners);
    setRuns((r) => r + runsScored);
    setStrikesThisAB(0);
    setPhase({
      kind: "outcome",
      hit,
      runsScored,
      runnersBefore: runners,
      runnersAfter: nextRunners,
      wasOut: false,
    });
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
      if (problemIndexRef.current >= problems.length || outs >= 3) {
        setPhase({ kind: "done" });
      } else {
        setPhase({ kind: "pitch" });
      }
    }, 500);
    return () => window.clearTimeout(id);
  }, [phase, outs, problems.length]);

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
      <main className="min-h-screen select-none bg-gradient-to-br from-sky-700 to-green-800 p-4 text-white">
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

  // In-game render (pitch / swing / outcome / between-pitches).
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
            <span className="rounded-full bg-amber-400/30 px-3 py-1 font-mono">
              {runners.first ? "●" : "○"}
              {runners.second ? "●" : "○"}
              {runners.third ? "●" : "○"}
            </span>
          </div>
        </header>

        {phase.kind === "pitch" && currentProblem && (
          <PitchScreen
            problem={currentProblem}
            onCorrect={() => handleCorrectAnswer(currentProblem)}
            onWrong={() => handleWrongAnswer(currentProblem)}
          />
        )}

        {phase.kind === "wind-up" && (
          <WindUp
            onReady={() =>
              setPhase({
                kind: "swing",
                problem: phase.problem,
                startTimeMs: Date.now(),
              })
            }
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
      </div>
    </main>
  );
}
