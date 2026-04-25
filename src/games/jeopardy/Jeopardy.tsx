import { useMemo, useState } from "react";
import type { Problem, ProblemSet } from "@/types/content";
import type { SessionResult } from "@/types/profile";
import { isAnswerCorrect, shuffle } from "@/lib/problem-pool";
import { playCorrect, playWrong } from "@/lib/sounds";

const VALUES = [100, 200, 300];

interface Cell {
  setIndex: number;
  value: number;
  problem: Problem;
  resolved: boolean;
  correct: boolean;
}

interface Board {
  categories: { id: string; title: string; topic?: string }[];
  cells: Cell[][];
}

type Phase =
  | { kind: "board" }
  | { kind: "playing"; row: number; col: number }
  | {
      kind: "feedback";
      row: number;
      col: number;
      correct: boolean;
      given: string;
    }
  | { kind: "done" };

interface Props {
  sets: ProblemSet[];
  profileId: string;
  onExit: () => void;
  onComplete: (result: SessionResult) => void;
}

export function Jeopardy({ sets, profileId, onExit, onComplete }: Props) {
  const board = useMemo(() => buildBoard(sets), [sets]);
  const [cells, setCells] = useState<Cell[][]>(() =>
    board.cells.map((row) => row.map((c) => ({ ...c }))),
  );
  const [phase, setPhase] = useState<Phase>({ kind: "board" });
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startedAt] = useState(() => Date.now());

  function pick(row: number, col: number) {
    if (cells[row][col].resolved) return;
    setPhase({ kind: "playing", row, col });
  }

  function submit(given: string) {
    if (phase.kind !== "playing") return;
    const cell = cells[phase.row][phase.col];
    const correct = isAnswerCorrect(cell.problem, given);
    if (correct) {
      setScore((s) => s + cell.value);
      setCorrectCount((c) => c + 1);
      playCorrect();
    } else {
      playWrong();
    }
    setCells((prev) =>
      prev.map((r, ri) =>
        r.map((c, ci) =>
          ri === phase.row && ci === phase.col
            ? { ...c, resolved: true, correct }
            : c,
        ),
      ),
    );
    setPhase({
      kind: "feedback",
      row: phase.row,
      col: phase.col,
      correct,
      given,
    });
  }

  function back() {
    if (phase.kind !== "feedback") return;
    const remaining = cells.flat().filter((c) => !c.resolved).length;
    if (remaining === 0) {
      const total = board.cells.flat().length;
      onComplete({
        profileId,
        setId: sets.map((s) => s.id).join(","),
        gameId: "jeopardy",
        completedAt: Date.now(),
        problemsAttempted: total,
        problemsCorrect: correctCount,
        durationMs: Date.now() - startedAt,
      });
      setPhase({ kind: "done" });
    } else {
      setPhase({ kind: "board" });
    }
  }

  if (phase.kind === "done") {
    return (
      <DoneScreen
        score={score}
        total={board.cells.flat().length}
        correct={correctCount}
        onExit={onExit}
      />
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 p-4 text-white">
      <div className="mx-auto max-w-5xl pt-6">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg bg-white/10 px-3 py-1 text-sm font-semibold hover:bg-white/20"
          >
            ← Quit
          </button>
          <div className="rounded-full bg-amber-300 px-4 py-1 text-lg font-extrabold text-blue-900">
            ${score}
          </div>
        </header>

        {phase.kind === "board" && (
          <>
            <h1 className="mt-6 text-center text-3xl font-extrabold">
              Pick a category & value
            </h1>
            <div
              className="mt-6 grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${board.categories.length}, minmax(0, 1fr))`,
              }}
            >
              {board.categories.map((cat) => (
                <div
                  key={cat.id}
                  className="rounded-xl bg-blue-700 p-3 text-center text-sm font-bold uppercase tracking-wide"
                >
                  {cat.title}
                </div>
              ))}
              {VALUES.map((value, rowIdx) =>
                board.categories.map((_, colIdx) => {
                  const cell = cells[rowIdx][colIdx];
                  return (
                    <button
                      key={`${rowIdx}-${colIdx}`}
                      type="button"
                      disabled={cell.resolved}
                      onClick={() => pick(rowIdx, colIdx)}
                      className={`rounded-xl p-6 text-2xl font-black transition ${
                        cell.resolved
                          ? cell.correct
                            ? "bg-emerald-600/60 text-white/40"
                            : "bg-rose-700/60 text-white/40"
                          : "bg-blue-600 text-amber-300 hover:bg-blue-500 active:scale-95"
                      }`}
                    >
                      {cell.resolved ? (cell.correct ? "✓" : "✗") : `$${value}`}
                    </button>
                  );
                }),
              )}
            </div>
          </>
        )}

        {phase.kind === "playing" && (
          <ProblemView
            cell={cells[phase.row][phase.col]}
            categoryTitle={board.categories[phase.col].title}
            onSubmit={submit}
          />
        )}

        {phase.kind === "feedback" && (
          <FeedbackView
            cell={cells[phase.row][phase.col]}
            given={phase.given}
            correct={phase.correct}
            onBack={back}
          />
        )}
      </div>
    </main>
  );
}

function ProblemView({
  cell,
  categoryTitle,
  onSubmit,
}: {
  cell: Cell;
  categoryTitle: string;
  onSubmit: (given: string) => void;
}) {
  return (
    <div className="mt-8 rounded-3xl bg-blue-800 p-8 shadow-md">
      <p className="text-center text-sm font-bold uppercase tracking-widest text-amber-300">
        {categoryTitle} — ${cell.value}
      </p>
      <h2 className="mt-3 text-center text-3xl font-bold">
        {cell.problem.prompt}
      </h2>
      <Answer problem={cell.problem} onSubmit={onSubmit} />
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
            className="rounded-xl bg-amber-300 px-4 py-4 text-xl font-bold text-blue-900 hover:bg-amber-200 active:scale-95"
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
          className="rounded-xl bg-emerald-400 px-4 py-4 text-xl font-bold text-blue-900 hover:bg-emerald-300"
        >
          True
        </button>
        <button
          type="button"
          onClick={() => onSubmit("false")}
          className="rounded-xl bg-rose-400 px-4 py-4 text-xl font-bold text-blue-900 hover:bg-rose-300"
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
        className="rounded-xl bg-amber-300 px-6 py-4 text-xl font-bold text-blue-900 hover:bg-amber-200 disabled:opacity-50"
      >
        Go
      </button>
    </form>
  );
}

function FeedbackView({
  cell,
  given,
  correct,
  onBack,
}: {
  cell: Cell;
  given: string;
  correct: boolean;
  onBack: () => void;
}) {
  const correctText = describeCorrect(cell.problem);
  return (
    <div className="mt-8 rounded-3xl bg-blue-800 p-8 text-center shadow-md">
      <div
        className={`rounded-2xl px-4 py-4 text-3xl font-black ${
          correct
            ? "bg-emerald-400 text-emerald-900"
            : "bg-rose-400 text-rose-950"
        }`}
      >
        {correct ? `✓ +$${cell.value}!` : `✗ Wrong`}
      </div>
      {!correct && (
        <p className="mt-4 text-amber-200">
          You said <b>{describeGiven(cell.problem, given)}</b>. The answer is{" "}
          <b>{correctText}</b>.
        </p>
      )}
      {cell.problem.explanation && (
        <p className="mt-3 text-slate-200/80">{cell.problem.explanation}</p>
      )}
      <button
        type="button"
        onClick={onBack}
        className="mt-6 w-full rounded-xl bg-amber-300 py-4 text-lg font-bold text-blue-900 hover:bg-amber-200"
      >
        Back to board
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
      ? "🏆 Champion!"
      : correct >= total * 0.7
        ? "Great game!"
        : correct >= total * 0.4
          ? "Solid effort!"
          : "Try again — you'll catch them next time!";
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 p-4 text-white">
      <div className="mx-auto max-w-md pt-12 text-center">
        <div className="rounded-3xl bg-blue-800 p-8 shadow-md">
          <h2 className="text-3xl font-extrabold">Game over!</h2>
          <div className="mt-6 text-7xl font-black text-amber-300">${score}</div>
          <p className="mt-4 text-lg font-semibold">
            {correct} / {total} correct
          </p>
          <p className="mt-2">{cheer}</p>
          <button
            type="button"
            onClick={onExit}
            className="mt-8 w-full rounded-2xl bg-amber-300 py-4 text-xl font-bold text-blue-900 hover:bg-amber-200"
          >
            Back to home
          </button>
        </div>
      </div>
    </main>
  );
}

function buildBoard(sets: ProblemSet[]): Board {
  // Use up to 5 sets as categories; each contributes 3 problems
  const chosen = sets.slice(0, 5);
  const categories = chosen.map((s) => ({
    id: s.id,
    title: s.title,
    topic: s.topic,
  }));
  const cells: Cell[][] = VALUES.map((value, rowIdx) =>
    chosen.map((set, colIdx) => {
      const shuffled = shuffle(set.problems);
      const problem = shuffled[rowIdx % shuffled.length];
      return {
        setIndex: colIdx,
        value,
        problem,
        resolved: false,
        correct: false,
      };
    }),
  );
  return { categories, cells };
}
