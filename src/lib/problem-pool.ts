import type { Problem } from "@/types/content";

export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function isAnswerCorrect(problem: Problem, given: string): boolean {
  const trimmed = given.trim();
  switch (problem.format) {
    case "multiple-choice": {
      const idx = Number(trimmed);
      return idx === problem.correctIndex;
    }
    case "numeric": {
      const n = Number(trimmed);
      if (Number.isNaN(n)) return false;
      const tol = problem.tolerance ?? 0;
      return Math.abs(n - problem.answer) <= tol;
    }
    case "fill-blank": {
      const normalized = trimmed.toLowerCase();
      if (normalized === problem.answer.trim().toLowerCase()) return true;
      return (problem.acceptableAnswers ?? []).some(
        (a) => a.trim().toLowerCase() === normalized,
      );
    }
    case "true-false": {
      if (trimmed === "true") return problem.answer === true;
      if (trimmed === "false") return problem.answer === false;
      return false;
    }
  }
}
