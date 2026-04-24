import type { GameDef } from "@/types/content";

export const GAMES: GameDef[] = [
  {
    id: "quiz-showdown",
    name: "Quiz Showdown",
    icon: "🎯",
    description: "Fast-paced questions. Tap the right answer!",
    supportedFormats: ["multiple-choice", "numeric", "true-false"],
    minProblemsToPlay: 1,
  },
];

export function getGame(id: string): GameDef | undefined {
  return GAMES.find((g) => g.id === id);
}
