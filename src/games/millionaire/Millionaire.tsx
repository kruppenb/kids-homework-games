import { useMemo, useState } from "react";
import type { Problem, ProblemSet } from "@/types/content";
import type { SessionResult } from "@/types/profile";
import { isAnswerCorrect, shuffle } from "@/lib/problem-pool";
import { playCorrect, playWrong } from "@/lib/sounds";

const LADDER = [
  100, 200, 500, 1000, 2000, 5000, 10000, 25000, 50000, 1000000,
];
const SAFE_HAVENS = new Set([1000, 50000]);

type Phase =
  | { kind: "playing"; level: number }
  | { kind: "feedback"; level: number; correct: boolean; given: string }
  | { kind: "won"; total: number }
  | { kind: "lost"; banked: number };

interface Props {
  set: ProblemSet;
  profileId: string;
  onExit: () => void;
  onComplete: (result: SessionResult) => void;
}

export function Millionaire({ set, profileId, onExit, onComplete }: Props) {
  const problems = useMemo(() => shuffle(set.problems).slice(0, LADDER.length), [set]);
  const [phase, setPhase] = useState<Phase>({ kind: "playing", level: 0 });
  const [correctCount, setCorrectCount] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [walkedAway, setWalkedAway] = useState(false);

  function submit(given: string) {
    if (phase.kind !== "playing") return;
    const problem = problems[phase.level];
    const correct = isAnswerCorrect(problem, given);
    if (correct) {
      setCorrectCount((c) => c + 1);
      playCorrect();
    } else {
      playWrong();
    }
    setPhase({ kind: "feedback", level: phase.level, correct, given });
  }

  function advance() {
    if (phase.kind !== "feedback") return;
    if (!phase.correct) {
      const banked = lastSafeHavenBefore(phase.level);
      finalize(banked, "lost");
      setPhase({ kind: "lost", banked });
      return;
    }
    if (phase.level === LADDER.length - 1) {
      const total = LADDER[LADDER.length - 1];
      finalize(total, "won");
      setPhase({ kind: "won", total });
      return;
    }
    setPhase({ kind: "playing", level: phase.level + 1 });
  }

  function walkAway() {
    if (phase.kind !== "playing") return;
    const banked = phase.level === 0 ? 0 : LADDER[phase.level - 1];
    finalize(banked, "won");
    setWalkedAway(true);
    setPhase({ kind: "won", total: banked });
  }

  function finalize(_banked: number, _outcome: "won" | "lost") {
    onComplete({
      profileId,
      setId: set.id,
      gameId: "millionaire",
      completedAt: Date.now(),
      problemsAttempted: phase.kind === "feedback" ? phase.level + 1 : phase.kind === "playing" ? phase.level : 0,
      problemsCorrect: correctCount,
      durationMs: Date.now() - startedAt,
    });
  }

  if (phase.kind === "won") {
    return (
      <EndScreen
        title={
          walkedAway
            ? "Banked!"
            : phase.total === LADDER[LADDER.length - 1]
              ? "🏆 Millionaire!"
              : "You won!"
        }
        amount={phase.total}
        cheer={
          walkedAway
            ? "Smart play — bank what you've earned."
            : "You climbed to the top!"
        }
        onExit={onExit}
      />
    );
  }
  if (phase.kind === "lost") {
    return (
      <EndScreen
        title="Game over"
        amount={phase.banked}
        cheer={
          phase.banked > 0
            ? "Banked from your last safe haven!"
            : "No safe haven yet — try again!"
        }
        onExit={onExit}
      />
    );
  }

  const level = phase.kind === "playing" ? phase.level : phase.level;
  const problem = problems[level];

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 p-4 text-white">
      <div className="mx-auto grid max-w-5xl gap-6 pt-6 md:grid-cols-[1fr_240px]">
        <div>
          <header className="flex items-center justify-between">
            <button
              type="button"
              onClick={onExit}
              className="rounded-lg bg-white/10 px-3 py-1 text-sm font-semibold hover:bg-white/20"
            >
              ← Quit
            </button>
            <div className="rounded-full bg-amber-300 px-4 py-1 text-lg font-extrabold text-purple-900">
              Level {level + 1}
            </div>
          </header>

          <div className="mt-6 rounded-3xl bg-purple-800 p-6 shadow-md sm:p-8">
            <p className="text-center text-sm font-bold uppercase tracking-widest text-amber-300">
              For ${LADDER[level].toLocaleString()}
            </p>
            <h2 className="mt-3 text-center text-3xl font-bold">
              {problem.prompt}
            </h2>

            {phase.kind === "playing" && (
              <Answer problem={problem} onSubmit={submit} />
            )}
            {phase.kind === "feedback" && (
              <FeedbackView
                problem={problem}
                correct={phase.correct}
                given={phase.given}
                level={phase.level}
                onNext={advance}
              />
            )}

            {phase.kind === "playing" && level > 0 && (
              <button
                type="button"
                onClick={walkAway}
                className="mt-6 w-full rounded-xl border-2 border-amber-300 py-3 text-amber-300 hover:bg-amber-300/10"
              >
                Bank ${LADDER[level - 1].toLocaleString()} & walk away
              </button>
            )}
          </div>
        </div>

        <Ladder current={level} />
      </div>
    </main>
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
  function handle(e: React.FormEvent) {
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
            className="rounded-xl bg-amber-300 px-4 py-4 text-xl font-bold text-purple-900 hover:bg-amber-200 active:scale-95"
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
          className="rounded-xl bg-emerald-400 px-4 py-4 text-xl font-bold text-purple-900 hover:bg-emerald-300"
        >
          True
        </button>
        <button
          type="button"
          onClick={() => onSubmit("false")}
          className="rounded-xl bg-rose-400 px-4 py-4 text-xl font-bold text-purple-900 hover:bg-rose-300"
        >
          False
        </button>
      </div>
    );
  }
  return (
    <form onSubmit={handle} className="mt-6 flex gap-3">
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        className="flex-1 rounded-xl bg-white px-4 py-4 text-center text-2xl font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-amber-300"
        placeholder="?"
      />
      <button
        type="submit"
        disabled={value.trim() === ""}
        className="rounded-xl bg-amber-300 px-6 py-4 text-xl font-bold text-purple-900 hover:bg-amber-200 disabled:opacity-50"
      >
        Final answer
      </button>
    </form>
  );
}

function FeedbackView({
  problem,
  correct,
  given,
  level,
  onNext,
}: {
  problem: Problem;
  correct: boolean;
  given: string;
  level: number;
  onNext: () => void;
}) {
  return (
    <div className="mt-6 text-center">
      <div
        className={`rounded-2xl px-4 py-4 text-3xl font-black ${
          correct
            ? "bg-emerald-400 text-emerald-900"
            : "bg-rose-400 text-rose-950"
        }`}
      >
        {correct
          ? `✓ +$${LADDER[level].toLocaleString()}!`
          : "✗ Wrong"}
      </div>
      {!correct && (
        <p className="mt-4 text-amber-200">
          You said <b>{describeGiven(problem, given)}</b>. The answer is{" "}
          <b>{describeCorrect(problem)}</b>.
        </p>
      )}
      {problem.explanation && (
        <p className="mt-3 text-slate-200/80">{problem.explanation}</p>
      )}
      <button
        type="button"
        onClick={onNext}
        className="mt-6 w-full rounded-xl bg-amber-300 py-4 text-lg font-bold text-purple-900 hover:bg-amber-200"
      >
        {correct ? "Next level →" : "See your final score"}
      </button>
    </div>
  );
}

function Ladder({ current }: { current: number }) {
  return (
    <ol className="space-y-1 rounded-2xl bg-purple-800/60 p-3 ring-1 ring-purple-500/30">
      {[...LADDER].reverse().map((amt, idxRev) => {
        const idx = LADDER.length - 1 - idxRev;
        const isCurrent = idx === current;
        const isPast = idx < current;
        const safe = SAFE_HAVENS.has(amt);
        return (
          <li
            key={amt}
            className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm font-semibold ${
              isCurrent
                ? "bg-amber-300 text-purple-900"
                : isPast
                  ? "text-slate-300"
                  : "text-amber-200/80"
            } ${safe ? "ring-2 ring-emerald-400" : ""}`}
          >
            <span>{idx + 1}</span>
            <span>${amt.toLocaleString()}</span>
            {safe && (
              <span className="ml-1 text-xs text-emerald-300">SAFE</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function lastSafeHavenBefore(level: number): number {
  let banked = 0;
  for (let i = 0; i < level; i++) {
    if (SAFE_HAVENS.has(LADDER[i])) banked = LADDER[i];
  }
  return banked;
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

function EndScreen({
  title,
  amount,
  cheer,
  onExit,
}: {
  title: string;
  amount: number;
  cheer: string;
  onExit: () => void;
}) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 p-4 text-white">
      <div className="mx-auto max-w-md pt-12 text-center">
        <div className="rounded-3xl bg-purple-800 p-8 shadow-md">
          <h2 className="text-3xl font-extrabold">{title}</h2>
          <div className="mt-6 text-6xl font-black text-amber-300">
            ${amount.toLocaleString()}
          </div>
          <p className="mt-4 text-lg font-semibold">{cheer}</p>
          <button
            type="button"
            onClick={onExit}
            className="mt-8 w-full rounded-2xl bg-amber-300 py-4 text-xl font-bold text-purple-900 hover:bg-amber-200"
          >
            Back to home
          </button>
        </div>
      </div>
    </main>
  );
}
