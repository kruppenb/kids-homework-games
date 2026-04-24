import { useMemo, useState } from "react";
import type { Problem, ProblemSet } from "@/types/content";
import type { SessionResult } from "@/types/profile";
import { isAnswerCorrect, shuffle } from "@/lib/problem-pool";

type Phase =
  | { kind: "playing"; index: number }
  | { kind: "feedback"; index: number; correct: boolean; given: string }
  | { kind: "done" };

interface Props {
  set: ProblemSet;
  profileId: string;
  onExit: () => void;
  onComplete: (result: SessionResult) => void;
}

export function QuizShowdown({ set, profileId, onExit, onComplete }: Props) {
  const problems = useMemo(() => shuffle(set.problems), [set]);
  const [phase, setPhase] = useState<Phase>({ kind: "playing", index: 0 });
  const [correctCount, setCorrectCount] = useState(0);
  const [startedAt] = useState(() => Date.now());

  function submitAnswer(given: string) {
    if (phase.kind !== "playing") return;
    const problem = problems[phase.index];
    const correct = isAnswerCorrect(problem, given);
    if (correct) setCorrectCount((c) => c + 1);
    setPhase({ kind: "feedback", index: phase.index, correct, given });
  }

  function advance() {
    if (phase.kind !== "feedback") return;
    const nextIndex = phase.index + 1;
    if (nextIndex >= problems.length) {
      const result: SessionResult = {
        profileId,
        setId: set.id,
        gameId: "quiz-showdown",
        completedAt: Date.now(),
        problemsAttempted: problems.length,
        problemsCorrect: correctCount,
        durationMs: Date.now() - startedAt,
      };
      onComplete(result);
      setPhase({ kind: "done" });
    } else {
      setPhase({ kind: "playing", index: nextIndex });
    }
  }

  if (phase.kind === "done") {
    return (
      <DoneScreen
        total={problems.length}
        correct={correctCount}
        onExit={onExit}
      />
    );
  }

  const currentIndex = phase.kind === "playing" ? phase.index : phase.index;
  const problem = problems[currentIndex];
  const progress = `${currentIndex + 1} / ${problems.length}`;

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-4">
      <div className="mx-auto max-w-xl pt-6">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg bg-white/80 px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm hover:bg-white"
          >
            ← Quit
          </button>
          <div className="text-sm font-semibold text-slate-700">{progress}</div>
        </header>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/60">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{
              width: `${((currentIndex + 1) / problems.length) * 100}%`,
            }}
          />
        </div>

        <div className="mt-8 rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200 sm:p-8">
          <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl">
            {problem.prompt}
          </h2>

          {phase.kind === "playing" && (
            <AnswerInput problem={problem} onSubmit={submitAnswer} />
          )}

          {phase.kind === "feedback" && (
            <FeedbackBlock
              problem={problem}
              correct={phase.correct}
              given={phase.given}
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
            className="rounded-2xl bg-indigo-500 px-4 py-5 text-xl font-bold text-white shadow-sm transition hover:bg-indigo-600 active:scale-95"
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
          className="rounded-2xl bg-emerald-500 px-4 py-5 text-xl font-bold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95"
        >
          True
        </button>
        <button
          type="button"
          onClick={() => onSubmit("false")}
          className="rounded-2xl bg-rose-500 px-4 py-5 text-xl font-bold text-white shadow-sm transition hover:bg-rose-600 active:scale-95"
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
        className="flex-1 rounded-2xl border-2 border-slate-300 px-4 py-4 text-center text-3xl font-bold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-200"
        placeholder="?"
      />
      <button
        type="submit"
        disabled={value.trim() === ""}
        className="rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
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
  onNext,
}: {
  problem: Problem;
  correct: boolean;
  given: string;
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
        {correct ? "✓ Correct!" : "✗ Not quite"}
      </div>

      {!correct && (
        <p className="mt-3 text-center text-slate-600">
          You said <b>{givenText}</b>. The answer is <b>{correctText}</b>.
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
        className="mt-6 w-full rounded-2xl bg-indigo-600 py-4 text-xl font-bold text-white shadow-sm transition hover:bg-indigo-700"
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
  total,
  correct,
  onExit,
}: {
  total: number;
  correct: number;
  onExit: () => void;
}) {
  const pct = Math.round((correct / total) * 100);
  const cheer =
    pct === 100
      ? "Perfect score! 🎉"
      : pct >= 80
        ? "Great job!"
        : pct >= 50
          ? "Good effort — keep going!"
          : "Keep practicing — you'll get it!";

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-4">
      <div className="mx-auto max-w-md pt-16 text-center">
        <div className="rounded-3xl bg-white p-8 shadow-md ring-1 ring-slate-200">
          <h2 className="text-3xl font-extrabold text-slate-900">All done!</h2>
          <div className="mt-6 text-7xl font-black text-indigo-600">
            {correct}
            <span className="text-3xl text-slate-400">/{total}</span>
          </div>
          <p className="mt-4 text-lg font-semibold text-slate-700">{cheer}</p>
          <button
            type="button"
            onClick={onExit}
            className="mt-8 w-full rounded-2xl bg-indigo-600 py-4 text-xl font-bold text-white shadow-sm transition hover:bg-indigo-700"
          >
            Back to home
          </button>
        </div>
      </div>
    </main>
  );
}
