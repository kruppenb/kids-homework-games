import { useMemo, useState } from "react";
import type { WordSet, WordEntry } from "@/types/content";
import type { SessionResult } from "@/types/profile";
import { shuffle } from "@/lib/problem-pool";
import { playCorrect, playWrong } from "@/lib/sounds";

type Phase =
  | { kind: "playing"; index: number; revealed: number }
  | { kind: "feedback"; index: number; correct: boolean; given: string }
  | { kind: "done" };

interface Props {
  set: WordSet;
  profileId: string;
  onExit: () => void;
  onComplete: (result: SessionResult) => void;
}

export function WordScramble({ set, profileId, onExit, onComplete }: Props) {
  const words = useMemo(() => shuffle(set.words), [set]);
  const [phase, setPhase] = useState<Phase>({
    kind: "playing",
    index: 0,
    revealed: 0,
  });
  const [correctCount, setCorrectCount] = useState(0);
  const [startedAt] = useState(() => Date.now());

  function submit(given: string) {
    if (phase.kind !== "playing") return;
    const word = words[phase.index];
    const correct =
      given.trim().toLowerCase() === word.word.trim().toLowerCase();
    if (correct) {
      setCorrectCount((c) => c + 1);
      playCorrect();
    } else {
      playWrong();
    }
    setPhase({ kind: "feedback", index: phase.index, correct, given });
  }

  function advance() {
    if (phase.kind !== "feedback") return;
    const next = phase.index + 1;
    if (next >= words.length) {
      onComplete({
        profileId,
        setId: set.id,
        gameId: "word-scramble",
        completedAt: Date.now(),
        problemsAttempted: words.length,
        problemsCorrect: correctCount,
        durationMs: Date.now() - startedAt,
      });
      setPhase({ kind: "done" });
    } else {
      setPhase({ kind: "playing", index: next, revealed: 0 });
    }
  }

  const idx = phase.kind === "done" ? 0 : phase.index;
  const word = words[idx];
  const scrambled = useScrambled(word.word, idx);

  if (phase.kind === "done") {
    return (
      <DoneScreen
        total={words.length}
        correct={correctCount}
        onExit={onExit}
      />
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 p-4">
      <div className="mx-auto max-w-xl pt-6">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg bg-white/80 px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm hover:bg-white"
          >
            ← Quit
          </button>
          <div className="text-sm font-semibold text-slate-700">
            {idx + 1} / {words.length}
          </div>
        </header>

        <div className="mt-8 rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200 sm:p-8">
          <p className="text-center text-sm font-semibold uppercase tracking-wider text-slate-500">
            Unscramble:
          </p>
          <h2 className="mt-2 text-center text-5xl font-black tracking-widest text-blue-700">
            {scrambled.toUpperCase()}
          </h2>

          {phase.kind === "playing" && (
            <PlayingBlock word={word} onSubmit={submit} />
          )}

          {phase.kind === "feedback" && (
            <FeedbackBlock
              word={word}
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

function PlayingBlock({
  word,
  onSubmit,
}: {
  word: WordEntry;
  onSubmit: (given: string) => void;
}) {
  const [value, setValue] = useState("");
  const [showHint, setShowHint] = useState(false);

  function handle(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim() === "") return;
    onSubmit(value);
    setValue("");
  }

  return (
    <form onSubmit={handle} className="mt-6">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-2xl border-2 border-slate-300 px-4 py-4 text-center text-2xl font-bold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-200"
        placeholder="Your answer"
      />
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setShowHint(true)}
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {showHint ? "Hint:" : "Need a hint?"}
        </button>
        <button
          type="submit"
          disabled={value.trim() === ""}
          className="flex-1 rounded-xl bg-blue-600 px-6 py-3 text-lg font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Submit
        </button>
      </div>
      {showHint && (
        <p className="mt-3 rounded-xl bg-blue-50 p-3 text-center text-blue-900">
          {word.hint}
        </p>
      )}
    </form>
  );
}

function FeedbackBlock({
  word,
  correct,
  given,
  onNext,
}: {
  word: WordEntry;
  correct: boolean;
  given: string;
  onNext: () => void;
}) {
  return (
    <div className="mt-6">
      <div
        className={`rounded-2xl px-4 py-4 text-center text-2xl font-bold ${
          correct
            ? "bg-emerald-100 text-emerald-700"
            : "bg-rose-100 text-rose-700"
        }`}
      >
        {correct ? "✓ Got it!" : "✗ Not quite"}
      </div>
      {!correct && (
        <p className="mt-3 text-center text-slate-600">
          You said <b>{given}</b>. The word is <b>{word.word}</b>.
        </p>
      )}
      <p className="mt-3 rounded-xl bg-slate-100 p-3 text-center text-slate-700">
        {word.hint}
      </p>
      <button
        type="button"
        onClick={onNext}
        className="mt-6 w-full rounded-2xl bg-blue-600 py-4 text-xl font-bold text-white shadow-sm transition hover:bg-blue-700"
      >
        Next →
      </button>
    </div>
  );
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
  const cheer =
    correct === total
      ? "🎉 Perfect spelling!"
      : correct >= total * 0.8
        ? "Awesome work!"
        : correct >= total * 0.5
          ? "Good try!"
          : "Keep reading and you'll spell it!";
  return (
    <main className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 p-4">
      <div className="mx-auto max-w-md pt-12 text-center">
        <div className="rounded-3xl bg-white p-8 shadow-md ring-1 ring-slate-200">
          <h2 className="text-3xl font-extrabold text-slate-900">All done!</h2>
          <div className="mt-6 text-7xl font-black text-blue-600">
            {correct}
            <span className="text-3xl text-slate-400">/{total}</span>
          </div>
          <p className="mt-4 text-lg font-semibold text-slate-700">{cheer}</p>
          <button
            type="button"
            onClick={onExit}
            className="mt-8 w-full rounded-2xl bg-blue-600 py-4 text-xl font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            Back to home
          </button>
        </div>
      </div>
    </main>
  );
}

function useScrambled(word: string, seed: number): string {
  // Stable scramble per (word, seed) — does not re-shuffle on every render.
  return useMemo(() => {
    const letters = word.toLowerCase().split("");
    if (letters.length <= 1) return letters.join("");
    let attempt = "";
    for (let tries = 0; tries < 10; tries++) {
      const out = [...letters];
      // seeded shuffle
      let s = seed * 9301 + word.length * 49297;
      for (let i = out.length - 1; i > 0; i--) {
        s = (s * 9301 + 49297) % 233280;
        const j = Math.floor((s / 233280) * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      attempt = out.join("");
      if (attempt !== word.toLowerCase()) break;
    }
    return attempt;
  }, [word, seed]);
}

