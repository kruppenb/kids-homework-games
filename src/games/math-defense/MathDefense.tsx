import { useEffect, useMemo, useRef, useState } from "react";
import type { Problem, ProblemSet } from "@/types/content";
import type { SessionResult } from "@/types/profile";
import { isAnswerCorrect, shuffle } from "@/lib/problem-pool";
import { playCorrect, playWrong } from "@/lib/sounds";

const ENEMIES_PER_WAVE = 5;
const TOTAL_WAVES = 3;
const MAX_HP = 5;
const ENEMY_TICK_MS = 1300;
const ENEMY_STEPS = 6;

type Phase =
  | { kind: "intro" }
  | {
      kind: "playing";
      wave: number;
      enemiesDefeated: number;
      enemyProgress: number; // 0..ENEMY_STEPS
      hp: number;
    }
  | { kind: "won"; hp: number }
  | { kind: "lost" };

interface Props {
  set: ProblemSet;
  profileId: string;
  onExit: () => void;
  onComplete: (result: SessionResult) => void;
}

export function MathDefense({ set, profileId, onExit, onComplete }: Props) {
  const problems = useMemo(() => shuffle(set.problems), [set]);
  const problemRef = useRef(0);
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [feedback, setFeedback] = useState<
    | { kind: "correct" }
    | { kind: "wrong"; correctText: string }
    | { kind: "miss" }
    | null
  >(null);
  const completedRef = useRef(false);

  function startGame() {
    problemRef.current = 0;
    setPhase({
      kind: "playing",
      wave: 0,
      enemiesDefeated: 0,
      enemyProgress: 0,
      hp: MAX_HP,
    });
  }

  // Enemy advance loop
  useEffect(() => {
    if (phase.kind !== "playing") return;
    const id = window.setInterval(() => {
      setPhase((p) => {
        if (p.kind !== "playing") return p;
        const next = p.enemyProgress + 1;
        if (next >= ENEMY_STEPS) {
          // Enemy reaches base
          setFeedback({ kind: "miss" });
          window.setTimeout(() => setFeedback(null), 900);
          const newHp = p.hp - 1;
          if (newHp <= 0) {
            return { kind: "lost" };
          }
          // Spawn next enemy
          return { ...p, enemyProgress: 0, hp: newHp };
        }
        return { ...p, enemyProgress: next };
      });
    }, ENEMY_TICK_MS);
    return () => window.clearInterval(id);
  }, [phase.kind]);

  function submit(given: string) {
    if (phase.kind !== "playing") return;
    const problem = problems[problemRef.current % problems.length];
    const correct = isAnswerCorrect(problem, given);
    if (correct) {
      setCorrectCount((c) => c + 1);
      playCorrect();
      setFeedback({ kind: "correct" });
      window.setTimeout(() => setFeedback(null), 600);
      setPhase((p) => {
        if (p.kind !== "playing") return p;
        const defeated = p.enemiesDefeated + 1;
        const totalThisWave = defeated;
        if (totalThisWave >= ENEMIES_PER_WAVE) {
          // Wave clear
          if (p.wave + 1 >= TOTAL_WAVES) {
            return { kind: "won", hp: p.hp };
          }
          return {
            kind: "playing",
            wave: p.wave + 1,
            enemiesDefeated: 0,
            enemyProgress: 0,
            hp: p.hp,
          };
        }
        return { ...p, enemiesDefeated: defeated, enemyProgress: 0 };
      });
    } else {
      setWrongCount((c) => c + 1);
      playWrong();
      setFeedback({
        kind: "wrong",
        correctText: describeCorrect(problem),
      });
      window.setTimeout(() => setFeedback(null), 900);
    }
    problemRef.current += 1;
  }

  // Fire completion exactly once when game ends. Hook must run on every render
  // (no early-returns above), so it stays in a stable order.
  useEffect(() => {
    if ((phase.kind === "won" || phase.kind === "lost") && !completedRef.current) {
      completedRef.current = true;
      onComplete({
        profileId,
        setId: set.id,
        gameId: "math-defense",
        completedAt: Date.now(),
        problemsAttempted: correctCount + wrongCount,
        problemsCorrect: correctCount,
        durationMs: Date.now() - startedAt,
      });
    }
  }, [phase.kind, correctCount, wrongCount, profileId, set.id, startedAt, onComplete]);

  if (phase.kind === "intro") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-stone-900 to-amber-950 p-4 text-amber-50">
        <div className="mx-auto max-w-md pt-12 text-center">
          <div className="rounded-3xl bg-stone-800 p-8 shadow-md ring-1 ring-amber-700/30">
            <h1 className="text-3xl font-extrabold text-amber-300">
              🏰 Math Defense
            </h1>
            <p className="mt-3">
              Enemies march toward your base. Solve problems fast to defeat them
              before they break through!
            </p>
            <p className="mt-2 text-sm text-amber-200/80">
              {TOTAL_WAVES} waves · {ENEMIES_PER_WAVE} enemies per wave · {MAX_HP} base HP
            </p>
            <button
              type="button"
              onClick={startGame}
              className="mt-6 w-full rounded-2xl bg-amber-400 py-4 text-xl font-bold text-stone-900 hover:bg-amber-300"
            >
              Defend!
            </button>
            <button
              type="button"
              onClick={onExit}
              className="mt-2 w-full rounded-xl py-2 text-amber-200/70 hover:text-amber-200"
            >
              Back
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (phase.kind === "won" || phase.kind === "lost") {
    const won = phase.kind === "won";
    return (
      <main className="min-h-screen bg-gradient-to-br from-stone-900 to-amber-950 p-4 text-amber-50">
        <div className="mx-auto max-w-md pt-12 text-center">
          <div className="rounded-3xl bg-stone-800 p-8 shadow-md ring-1 ring-amber-700/30">
            <h2 className="text-3xl font-extrabold text-amber-300">
              {won ? "🏆 Base defended!" : "💥 Base destroyed"}
            </h2>
            <p className="mt-4 text-lg">
              {correctCount} / {correctCount + wrongCount} correct
            </p>
            <p className="mt-2 text-sm text-amber-200/80">
              {won ? `Survived with ${phase.hp} HP` : "Try again with steadier nerves!"}
            </p>
            <button
              type="button"
              onClick={onExit}
              className="mt-6 w-full rounded-2xl bg-amber-400 py-4 text-xl font-bold text-stone-900 hover:bg-amber-300"
            >
              Back to home
            </button>
          </div>
        </div>
      </main>
    );
  }

  const problem = problems[problemRef.current % problems.length];
  const enemyPositionPct = (phase.enemyProgress / ENEMY_STEPS) * 100;

  return (
    <main className="min-h-screen bg-gradient-to-br from-stone-900 to-amber-950 p-4 text-amber-50">
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
            <span className="rounded-full bg-amber-400/20 px-3 py-1">
              Wave {phase.wave + 1}/{TOTAL_WAVES}
            </span>
            <span className="rounded-full bg-rose-400/30 px-3 py-1">
              ❤ {phase.hp}
            </span>
            <span className="rounded-full bg-emerald-400/30 px-3 py-1">
              {phase.enemiesDefeated}/{ENEMIES_PER_WAVE}
            </span>
          </div>
        </header>

        {/* Battlefield */}
        <div className="relative mt-4 h-20 overflow-hidden rounded-2xl bg-stone-800 ring-1 ring-amber-700/30">
          <div
            className="absolute top-1/2 -translate-y-1/2 text-3xl transition-all duration-200"
            style={{ right: `${100 - enemyPositionPct}%`, transform: `translate(50%, -50%)` }}
          >
            👾
          </div>
          <div className="absolute right-0 top-0 flex h-full w-12 items-center justify-center bg-amber-700/40 text-2xl">
            🏰
          </div>
          {feedback && (
            <div
              className={`absolute inset-0 flex items-center justify-center text-2xl font-black ${
                feedback.kind === "correct"
                  ? "bg-emerald-400/30 text-emerald-200"
                  : feedback.kind === "wrong"
                    ? "bg-rose-400/30 text-rose-200"
                    : "bg-amber-400/30 text-amber-100"
              }`}
            >
              {feedback.kind === "correct"
                ? "💥 Defeated!"
                : feedback.kind === "wrong"
                  ? `Wrong! Answer: ${feedback.correctText}`
                  : "💢 Enemy hit your base!"}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-3xl bg-stone-800 p-6 shadow-md ring-1 ring-amber-700/30">
          <h2 className="text-center text-3xl font-bold">{problem.prompt}</h2>
          <Answer problem={problem} onSubmit={submit} />
        </div>
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
            className="rounded-xl bg-amber-400 px-4 py-4 text-xl font-bold text-stone-900 hover:bg-amber-300 active:scale-95"
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
          className="rounded-xl bg-emerald-400 px-4 py-4 text-xl font-bold text-stone-900 hover:bg-emerald-300"
        >
          True
        </button>
        <button
          type="button"
          onClick={() => onSubmit("false")}
          className="rounded-xl bg-rose-400 px-4 py-4 text-xl font-bold text-stone-900 hover:bg-rose-300"
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
        className="flex-1 rounded-xl bg-amber-50 px-4 py-4 text-center text-2xl font-bold text-stone-900 focus:outline-none focus:ring-4 focus:ring-amber-400"
        placeholder="?"
      />
      <button
        type="submit"
        disabled={value.trim() === ""}
        className="rounded-xl bg-amber-400 px-6 py-4 text-xl font-bold text-stone-900 hover:bg-amber-300 disabled:opacity-50"
      >
        Fire!
      </button>
    </form>
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
