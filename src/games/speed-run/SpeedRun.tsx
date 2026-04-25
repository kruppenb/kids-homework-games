import { useEffect, useMemo, useRef, useState } from "react";
import type { Problem, ProblemSet } from "@/types/content";
import type { SessionResult } from "@/types/profile";
import { isAnswerCorrect, shuffle } from "@/lib/problem-pool";
import { playCorrect, playWrong } from "@/lib/sounds";

const SECONDS_PER_PROBLEM = 12;
const POINTS_BASE = 100;

type Phase =
  | { kind: "intro" }
  | { kind: "playing"; index: number; secondsLeft: number }
  | {
      kind: "feedback";
      index: number;
      correct: boolean;
      given: string;
      pointsEarned: number;
      timedOut: boolean;
    }
  | { kind: "done" };

interface Props {
  set: ProblemSet;
  profileId: string;
  onExit: () => void;
  onComplete: (result: SessionResult) => void;
}

export function SpeedRun({ set, profileId, onExit, onComplete }: Props) {
  const problems = useMemo(() => shuffle(set.problems), [set]);
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const startedAtRef = useRef<number>(0);

  function startGame() {
    startedAtRef.current = Date.now();
    setPhase({ kind: "playing", index: 0, secondsLeft: SECONDS_PER_PROBLEM });
  }

  useEffect(() => {
    if (phase.kind !== "playing") return;
    if (phase.secondsLeft <= 0) {
      handleSubmit("", true);
      return;
    }
    const id = window.setTimeout(() => {
      setPhase((p) =>
        p.kind === "playing" && p.index === phase.index
          ? { ...p, secondsLeft: p.secondsLeft - 1 }
          : p,
      );
    }, 1000);
    return () => window.clearTimeout(id);
  }, [phase]);

  function handleSubmit(given: string, timedOut = false) {
    if (phase.kind !== "playing") return;
    const problem = problems[phase.index];
    const correct = !timedOut && isAnswerCorrect(problem, given);
    let pointsEarned = 0;
    if (correct) {
      const newCombo = combo + 1;
      pointsEarned = POINTS_BASE * newCombo;
      setCombo(newCombo);
      setScore((s) => s + pointsEarned);
      setCorrectCount((c) => c + 1);
      playCorrect();
    } else {
      setCombo(0);
      playWrong();
    }
    setPhase({
      kind: "feedback",
      index: phase.index,
      correct,
      given,
      pointsEarned,
      timedOut,
    });
  }

  function advance() {
    if (phase.kind !== "feedback") return;
    const nextIndex = phase.index + 1;
    if (nextIndex >= problems.length) {
      onComplete({
        profileId,
        setId: set.id,
        gameId: "speed-run",
        completedAt: Date.now(),
        problemsAttempted: problems.length,
        problemsCorrect: correctCount,
        durationMs: Date.now() - startedAtRef.current,
      });
      setPhase({ kind: "done" });
    } else {
      setPhase({
        kind: "playing",
        index: nextIndex,
        secondsLeft: SECONDS_PER_PROBLEM,
      });
    }
  }

  if (phase.kind === "intro") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-rose-50 to-orange-100 p-4">
        <div className="mx-auto max-w-md pt-12 text-center">
          <div className="rounded-3xl bg-white p-8 shadow-md ring-1 ring-slate-200">
            <h1 className="text-3xl font-extrabold text-slate-900">⚡ Speed Run</h1>
            <p className="mt-3 text-slate-700">
              Answer fast! Keep getting them right to grow your combo.
              Each correct answer = <b>{POINTS_BASE}</b> × combo.
            </p>
            <p className="mt-2 text-slate-500">
              {SECONDS_PER_PROBLEM} seconds per question.
            </p>
            <button
              type="button"
              onClick={startGame}
              className="mt-6 w-full rounded-2xl bg-rose-500 py-4 text-xl font-bold text-white shadow-sm transition hover:bg-rose-600"
            >
              Start
            </button>
            <button
              type="button"
              onClick={onExit}
              className="mt-2 w-full rounded-xl py-2 text-slate-500 transition hover:text-slate-800"
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
      <DoneScreen
        score={score}
        total={problems.length}
        correct={correctCount}
        onExit={onExit}
      />
    );
  }

  const currentIndex = phase.kind === "playing" ? phase.index : phase.index;
  const problem = problems[currentIndex];
  const progress = `${currentIndex + 1} / ${problems.length}`;
  const timerPct =
    phase.kind === "playing"
      ? Math.max(0, (phase.secondsLeft / SECONDS_PER_PROBLEM) * 100)
      : phase.timedOut
        ? 0
        : 100;
  const timerLow = phase.kind === "playing" && phase.secondsLeft <= 3;

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 to-orange-100 p-4">
      <div className="mx-auto max-w-xl pt-6">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg bg-white/80 px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm hover:bg-white"
          >
            ← Quit
          </button>
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
            <span>{progress}</span>
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-amber-900">
              {combo}× combo
            </span>
            <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-emerald-900">
              {score} pts
            </span>
          </div>
        </header>

        <div
          className={`mt-2 h-2 overflow-hidden rounded-full bg-white/60 transition-colors ${
            timerLow ? "ring-2 ring-rose-400" : ""
          }`}
        >
          <div
            className={`h-full rounded-full transition-all ${
              timerLow ? "bg-rose-500" : "bg-rose-400"
            }`}
            style={{ width: `${timerPct}%` }}
          />
        </div>

        <div className="mt-8 rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl">
            {problem.prompt}
          </h2>

          {phase.kind === "playing" && (
            <AnswerInput problem={problem} onSubmit={(g) => handleSubmit(g)} />
          )}

          {phase.kind === "feedback" && (
            <FeedbackBlock
              problem={problem}
              correct={phase.correct}
              given={phase.given}
              pointsEarned={phase.pointsEarned}
              timedOut={phase.timedOut}
              onNext={advance}
            />
          )}
        </div>
      </div>
    </main>
  );
}

function AnswerInput({
  problem,
  onSubmit,
}: {
  problem: Problem;
  onSubmit: (given: string) => void;
}) {
  if (problem.format === "multiple-choice") {
    return (
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {problem.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSubmit(String(i))}
            className="rounded-2xl bg-rose-500 px-4 py-5 text-xl font-bold text-white shadow-sm transition hover:bg-rose-600 active:scale-95"
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
          className="rounded-2xl bg-emerald-500 px-4 py-5 text-xl font-bold text-white shadow-sm hover:bg-emerald-600 active:scale-95"
        >
          True
        </button>
        <button
          type="button"
          onClick={() => onSubmit("false")}
          className="rounded-2xl bg-rose-500 px-4 py-5 text-xl font-bold text-white shadow-sm hover:bg-rose-600 active:scale-95"
        >
          False
        </button>
      </div>
    );
  }
  return <NumericInput onSubmit={onSubmit} />;
}

function NumericInput({ onSubmit }: { onSubmit: (given: string) => void }) {
  const [value, setValue] = useState("");
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim() === "") return;
    onSubmit(value);
    setValue("");
  }
  return (
    <form onSubmit={handleSubmit} className="mt-6 flex gap-3">
      <input
        type="text"
        inputMode="numeric"
        pattern="-?[0-9]*\.?[0-9]*"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        className="flex-1 rounded-2xl border-2 border-slate-300 px-4 py-4 text-center text-3xl font-bold text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-200"
        placeholder="?"
      />
      <button
        type="submit"
        disabled={value.trim() === ""}
        className="rounded-2xl bg-rose-600 px-6 py-4 text-lg font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Go
      </button>
    </form>
  );
}

function FeedbackBlock({
  problem,
  correct,
  given,
  pointsEarned,
  timedOut,
  onNext,
}: {
  problem: Problem;
  correct: boolean;
  given: string;
  pointsEarned: number;
  timedOut: boolean;
  onNext: () => void;
}) {
  const correctText = describeCorrect(problem);
  const givenText = describeGiven(problem, given);

  return (
    <div className="mt-6">
      <div
        className={`rounded-2xl px-4 py-4 text-center text-2xl font-bold ${
          correct
            ? "bg-emerald-100 text-emerald-700"
            : "bg-rose-100 text-rose-700"
        }`}
      >
        {correct
          ? `✓ +${pointsEarned} pts!`
          : timedOut
            ? "⏱ Time's up!"
            : "✗ Combo broken"}
      </div>

      {!correct && (
        <p className="mt-3 text-center text-slate-600">
          {timedOut
            ? `The answer was ${correctText}.`
            : `You said ${givenText}. The answer is ${correctText}.`}
        </p>
      )}

      {problem.explanation && (
        <p className="mt-3 rounded-xl bg-slate-100 p-3 text-center text-slate-700">
          {problem.explanation}
        </p>
      )}

      <button
        type="button"
        onClick={onNext}
        className="mt-6 w-full rounded-2xl bg-rose-600 py-4 text-xl font-bold text-white shadow-sm transition hover:bg-rose-700"
      >
        Next →
      </button>
    </div>
  );
}

function describeCorrect(problem: Problem): string {
  switch (problem.format) {
    case "multiple-choice":
      return problem.options[problem.correctIndex];
    case "numeric":
      return String(problem.answer);
    case "fill-blank":
      return problem.answer;
    case "true-false":
      return problem.answer ? "True" : "False";
  }
}

function describeGiven(problem: Problem, given: string): string {
  if (given === "") return "(no answer)";
  if (problem.format === "multiple-choice") {
    const i = Number(given);
    return problem.options[i] ?? given;
  }
  if (problem.format === "true-false") {
    return given === "true" ? "True" : given === "false" ? "False" : given;
  }
  return given;
}

function DoneScreen({
  score,
  total,
  correct,
  onExit,
}: {
  score: number;
  total: number;
  correct: number;
  onExit: () => void;
}) {
  const cheer =
    correct === total
      ? "🔥 Perfect run!"
      : correct >= total * 0.8
        ? "🎉 Awesome speed!"
        : correct >= total * 0.5
          ? "Nice effort!"
          : "Keep training — you'll get faster!";
  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 to-orange-100 p-4">
      <div className="mx-auto max-w-md pt-12 text-center">
        <div className="rounded-3xl bg-white p-8 shadow-md ring-1 ring-slate-200">
          <h2 className="text-3xl font-extrabold text-slate-900">Run finished!</h2>
          <div className="mt-6 text-7xl font-black text-rose-600">{score}</div>
          <p className="mt-1 text-sm font-semibold text-slate-500">total points</p>
          <p className="mt-4 text-lg font-semibold text-slate-700">
            {correct} / {total} correct
          </p>
          <p className="mt-2 text-slate-700">{cheer}</p>
          <button
            type="button"
            onClick={onExit}
            className="mt-8 w-full rounded-2xl bg-rose-600 py-4 text-xl font-bold text-white shadow-sm transition hover:bg-rose-700"
          >
            Back to home
          </button>
        </div>
      </div>
    </main>
  );
}
