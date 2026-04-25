import { useMemo, useState } from "react";
import type { Problem, ProblemSet } from "@/types/content";
import type { SessionResult } from "@/types/profile";
import { isAnswerCorrect, shuffle } from "@/lib/problem-pool";
import { playCorrect, playWrong } from "@/lib/sounds";

const BLOCK_COLORS = [
  "bg-rose-400",
  "bg-orange-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-sky-400",
  "bg-violet-400",
  "bg-pink-400",
  "bg-lime-400",
  "bg-cyan-400",
  "bg-fuchsia-400",
];

type Phase =
  | { kind: "playing"; index: number }
  | {
      kind: "feedback";
      index: number;
      correct: boolean;
      given: string;
    }
  | { kind: "done" };

interface Props {
  set: ProblemSet;
  profileId: string;
  onExit: () => void;
  onComplete: (result: SessionResult) => void;
}

export function TowerBuilder({ set, profileId, onExit, onComplete }: Props) {
  const problems = useMemo(() => shuffle(set.problems), [set]);
  const [phase, setPhase] = useState<Phase>({ kind: "playing", index: 0 });
  const [blocks, setBlocks] = useState<number[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [startedAt] = useState(() => Date.now());

  function submit(given: string) {
    if (phase.kind !== "playing") return;
    const problem = problems[phase.index];
    const correct = isAnswerCorrect(problem, given);
    if (correct) {
      setCorrectCount((c) => c + 1);
      setBlocks((b) => [...b, b.length % BLOCK_COLORS.length]);
      playCorrect();
    } else {
      playWrong();
    }
    setPhase({ kind: "feedback", index: phase.index, correct, given });
  }

  function advance() {
    if (phase.kind !== "feedback") return;
    const next = phase.index + 1;
    if (next >= problems.length) {
      onComplete({
        profileId,
        setId: set.id,
        gameId: "tower-builder",
        completedAt: Date.now(),
        problemsAttempted: problems.length,
        problemsCorrect: correctCount,
        durationMs: Date.now() - startedAt,
      });
      setPhase({ kind: "done" });
    } else {
      setPhase({ kind: "playing", index: next });
    }
  }

  if (phase.kind === "done") {
    return (
      <DoneScreen
        blocks={blocks.length}
        total={problems.length}
        onExit={onExit}
      />
    );
  }

  const idx = phase.index;
  const problem = problems[idx];

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-100 to-emerald-100 p-4">
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 pt-6 md:grid-cols-2">
        <div>
          <header className="flex items-center justify-between">
            <button
              type="button"
              onClick={onExit}
              className="rounded-lg bg-white/80 px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm hover:bg-white"
            >
              ← Quit
            </button>
            <div className="text-sm font-semibold text-slate-700">
              {idx + 1} / {problems.length}
            </div>
          </header>

          <div className="mt-6 rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
            <h2 className="text-center text-3xl font-bold text-slate-900">
              {problem.prompt}
            </h2>
            {phase.kind === "playing" && (
              <AnswerInput problem={problem} onSubmit={submit} />
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

        <Tower blocks={blocks} target={problems.length} />
      </div>
    </main>
  );
}

function Tower({ blocks, target }: { blocks: number[]; target: number }) {
  const remaining = Math.max(0, target - blocks.length);
  return (
    <div className="flex flex-col items-center">
      <div className="text-sm font-semibold text-slate-700">
        Tower: {blocks.length} / {target}
      </div>
      <div className="mt-2 flex h-[420px] w-40 flex-col-reverse items-center justify-start rounded-2xl bg-white/40 p-2 ring-1 ring-slate-200">
        {/* Ground line */}
        <div className="h-1 w-full rounded-full bg-slate-300" />
        {blocks.map((c, i) => (
          <div
            key={i}
            className={`mt-1 h-7 w-28 rounded-md ${BLOCK_COLORS[c]} shadow-sm transition-all`}
            style={{
              animation: i === blocks.length - 1 ? "tower-pop 240ms ease-out" : undefined,
            }}
          />
        ))}
        {/* Phantom space */}
        <div className="flex-1" />
      </div>
      <p className="mt-3 text-center text-sm text-slate-600">
        {remaining === 0
          ? "🏆 You built it all!"
          : `${remaining} block${remaining === 1 ? "" : "s"} to go`}
      </p>
      <style>{`
        @keyframes tower-pop {
          0% { transform: translateY(-20px) scale(0.6); opacity: 0; }
          60% { transform: translateY(2px) scale(1.05); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
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
            className="rounded-2xl bg-emerald-500 px-4 py-5 text-2xl font-bold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95"
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
          className="rounded-2xl bg-emerald-500 px-4 py-5 text-2xl font-bold text-white shadow-sm hover:bg-emerald-600 active:scale-95"
        >
          True
        </button>
        <button
          type="button"
          onClick={() => onSubmit("false")}
          className="rounded-2xl bg-rose-500 px-4 py-5 text-2xl font-bold text-white shadow-sm hover:bg-rose-600 active:scale-95"
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
        className="flex-1 rounded-2xl border-2 border-slate-300 px-4 py-4 text-center text-3xl font-bold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-200"
        placeholder="?"
      />
      <button
        type="submit"
        disabled={value.trim() === ""}
        className="rounded-2xl bg-emerald-600 px-6 py-4 text-lg font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:bg-slate-300"
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
            : "bg-amber-100 text-amber-700"
        }`}
      >
        {correct ? "🎉 Block added!" : "Try again next time"}
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
        className="mt-6 w-full rounded-2xl bg-emerald-600 py-4 text-xl font-bold text-white shadow-sm transition hover:bg-emerald-700"
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
  blocks,
  total,
  onExit,
}: {
  blocks: number;
  total: number;
  onExit: () => void;
}) {
  const cheer =
    blocks === total
      ? "🏆 Tower complete!"
      : blocks >= total * 0.8
        ? "🎉 Almost finished it!"
        : blocks >= total * 0.5
          ? "Nice tower!"
          : "Keep building — you'll grow it taller!";
  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-100 to-emerald-100 p-4">
      <div className="mx-auto max-w-md pt-12 text-center">
        <div className="rounded-3xl bg-white p-8 shadow-md ring-1 ring-slate-200">
          <h2 className="text-3xl font-extrabold text-slate-900">Tower complete!</h2>
          <div className="mt-6 text-7xl font-black text-emerald-600">
            {blocks}
            <span className="text-3xl text-slate-400">/{total}</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-500">blocks built</p>
          <p className="mt-4 text-lg font-semibold text-slate-700">{cheer}</p>
          <button
            type="button"
            onClick={onExit}
            className="mt-8 w-full rounded-2xl bg-emerald-600 py-4 text-xl font-bold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Back to home
          </button>
        </div>
      </div>
    </main>
  );
}
