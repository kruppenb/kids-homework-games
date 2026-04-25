import type { GameDef } from "@/types/content";

export const GAMES: GameDef[] = [
  {
    id: "quiz-showdown",
    name: "Quiz Showdown",
    icon: "🎯",
    description: "Tap the right answer at your own pace.",
    supportedFormats: ["multiple-choice", "numeric", "true-false"],
    minProblemsToPlay: 1,
  },
  {
    id: "speed-run",
    name: "Speed Run",
    icon: "⚡",
    description: "Beat the clock. Combo bonus for streaks!",
    supportedFormats: ["multiple-choice", "numeric", "true-false"],
    minProblemsToPlay: 5,
  },
  {
    id: "tower-builder",
    name: "Tower Builder",
    icon: "🧱",
    description: "Stack a block for every correct answer.",
    supportedFormats: ["multiple-choice", "numeric", "true-false"],
    minProblemsToPlay: 1,
  },
];

export function getGame(id: string): GameDef | undefined {
  return GAMES.find((g) => g.id === id);
}
