import { useEffect, useState } from "react";
import type { Problem, ProblemSet } from "@/types/content";
import type { SessionResult } from "@/types/profile";
import { shuffle } from "@/lib/problem-pool";
import { playCorrect, playWrong } from "@/lib/sounds";

const PAIR_COUNT = 6; // 12 cards in 4x3 grid

interface Card {
  id: string;
  pairId: string;
  text: string;
  side: "prompt" | "answer";
  matched: boolean;
  flipped: boolean;
}

interface Props {
  set: ProblemSet;
  profileId: string;
  onExit: () => void;
  onComplete: (result: SessionResult) => void;
}

export function MatchMaster({ set, profileId, onExit, onComplete }: Props) {
  const [cards, setCards] = useState<Card[]>(() => buildCards(set));
  const [first, setFirst] = useState<number | null>(null);
  const [second, setSecond] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [completed, setCompleted] = useState(false);

  const allMatched = matches === PAIR_COUNT;

  useEffect(() => {
    if (first === null || second === null) return;
    const a = cards[first];
    const b = cards[second];
    setMoves((m) => m + 1);
    if (a.pairId === b.pairId && a.side !== b.side) {
      // Match
      playCorrect();
      setCards((prev) =>
        prev.map((c, i) =>
          i === first || i === second ? { ...c, matched: true } : c,
        ),
      );
      setMatches((m) => m + 1);
      setFirst(null);
      setSecond(null);
    } else {
      playWrong();
      const id = window.setTimeout(() => {
        setCards((prev) =>
          prev.map((c, i) =>
            i === first || i === second ? { ...c, flipped: false } : c,
          ),
        );
        setFirst(null);
        setSecond(null);
      }, 900);
      return () => window.clearTimeout(id);
    }
  }, [first, second, cards]);

  useEffect(() => {
    if (allMatched && !completed) {
      setCompleted(true);
      onComplete({
        profileId,
        setId: set.id,
        gameId: "match-master",
        completedAt: Date.now(),
        problemsAttempted: PAIR_COUNT,
        problemsCorrect: PAIR_COUNT,
        durationMs: Date.now() - startedAt,
      });
    }
  }, [allMatched, completed, onComplete, profileId, set.id, startedAt]);

  function flip(idx: number) {
    if (cards[idx].matched || cards[idx].flipped) return;
    if (first !== null && second !== null) return;
    setCards((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, flipped: true } : c)),
    );
    if (first === null) setFirst(idx);
    else setSecond(idx);
  }

  if (allMatched) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-fuchsia-100 to-purple-200 p-4">
        <div className="mx-auto max-w-md pt-12 text-center">
          <div className="rounded-3xl bg-white p-8 shadow-md ring-1 ring-slate-200">
            <h2 className="text-3xl font-extrabold text-slate-900">All matched!</h2>
            <div className="mt-6 text-7xl font-black text-fuchsia-600">
              {moves}
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              moves taken
            </p>
            <p className="mt-4 text-lg font-semibold text-slate-700">
              {moves <= PAIR_COUNT + 2
                ? "🌟 Wow — almost perfect memory!"
                : moves <= PAIR_COUNT * 2
                  ? "Nice memory!"
                  : "You got 'em all!"}
            </p>
            <button
              type="button"
              onClick={onExit}
              className="mt-8 w-full rounded-2xl bg-fuchsia-600 py-4 text-xl font-bold text-white shadow-sm transition hover:bg-fuchsia-700"
            >
              Back to home
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-fuchsia-100 to-purple-200 p-4">
      <div className="mx-auto max-w-2xl pt-6">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg bg-white/80 px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm hover:bg-white"
          >
            ← Quit
          </button>
          <div className="flex gap-2 text-sm font-semibold text-slate-700">
            <span className="rounded-full bg-fuchsia-200 px-3 py-1">
              {matches}/{PAIR_COUNT} pairs
            </span>
            <span className="rounded-full bg-purple-200 px-3 py-1">
              {moves} moves
            </span>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {cards.map((card, idx) => (
            <button
              key={card.id}
              type="button"
              onClick={() => flip(idx)}
              disabled={card.matched}
              className={`aspect-square rounded-xl text-base font-bold shadow-sm transition sm:text-lg ${
                card.matched
                  ? "bg-emerald-200 text-emerald-900 ring-2 ring-emerald-400"
                  : card.flipped
                    ? "bg-white text-slate-900 ring-2 ring-fuchsia-400"
                    : "bg-fuchsia-500 text-white hover:bg-fuchsia-600 active:scale-95"
              }`}
            >
              <span className="block px-2 py-1 text-center leading-tight">
                {card.matched || card.flipped ? card.text : "?"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

function buildCards(set: ProblemSet): Card[] {
  // Build pairs: prompt ↔ correct answer string for MC and numeric problems.
  const pickable = set.problems.filter(canPair);
  const chosen = shuffle(pickable).slice(0, PAIR_COUNT);
  const cards: Card[] = [];
  for (const p of chosen) {
    cards.push({
      id: `${p.id}-prompt`,
      pairId: p.id,
      text: p.prompt,
      side: "prompt",
      matched: false,
      flipped: false,
    });
    cards.push({
      id: `${p.id}-answer`,
      pairId: p.id,
      text: answerText(p),
      side: "answer",
      matched: false,
      flipped: false,
    });
  }
  return shuffle(cards);
}

function canPair(p: Problem): boolean {
  return p.format === "multiple-choice" || p.format === "numeric";
}

function answerText(p: Problem): string {
  if (p.format === "multiple-choice") return p.options[p.correctIndex];
  if (p.format === "numeric") return String(p.answer);
  return "";
}
