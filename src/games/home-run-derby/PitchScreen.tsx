import { useState } from "react";
import type { Problem } from "@/types/content";
import { isAnswerCorrect } from "@/lib/problem-pool";

interface Props {
  problem: Problem;
  onCorrect: () => void;
  onWrong: () => void;
}

export function PitchScreen({ problem, onCorrect, onWrong }: Props) {
  function submit(given: string) {
    if (isAnswerCorrect(problem, given)) {
      onCorrect();
    } else {
      onWrong();
    }
  }

  return (
    <div className="mt-6 rounded-3xl bg-slate-900/70 p-6 shadow-md ring-1 ring-sky-400/30">
      <h2 className="text-center text-3xl font-bold text-white">
        {problem.prompt}
      </h2>
      <Answer problem={problem} onSubmit={submit} />
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

  function handleFormSubmit(e: React.FormEvent) {
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
            className="rounded-xl bg-yellow-400 px-4 py-4 text-xl font-bold text-slate-900 hover:bg-yellow-300 active:scale-95"
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
          className="rounded-xl bg-emerald-400 px-4 py-4 text-xl font-bold text-slate-900 hover:bg-emerald-300"
        >
          True
        </button>
        <button
          type="button"
          onClick={() => onSubmit("false")}
          className="rounded-xl bg-rose-400 px-4 py-4 text-xl font-bold text-slate-900 hover:bg-rose-300"
        >
          False
        </button>
      </div>
    );
  }

  // numeric (and fill-blank fallback — not in supportedFormats, but safe to render)
  return (
    <form onSubmit={handleFormSubmit} className="mt-6 flex gap-3">
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        className="flex-1 rounded-xl bg-yellow-50 px-4 py-4 text-center text-2xl font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-yellow-400"
        placeholder="?"
      />
      <button
        type="submit"
        disabled={value.trim() === ""}
        className="rounded-xl bg-yellow-400 px-6 py-4 text-xl font-bold text-slate-900 hover:bg-yellow-300 disabled:opacity-50"
      >
        Swing!
      </button>
    </form>
  );
}
