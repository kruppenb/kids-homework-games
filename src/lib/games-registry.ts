import type { GameDef } from "@/types/content";

export const GAMES: GameDef[] = [
  {
    id: "quiz-showdown",
    name: "Quiz Showdown",
    icon: "🎯",
    description: "Tap the right answer at your own pace.",
    consumes: "problems",
    supportedFormats: ["multiple-choice", "numeric", "true-false"],
    minProblemsToPlay: 1,
  },
  {
    id: "speed-run",
    name: "Speed Run",
    icon: "⚡",
    description: "Beat the clock. Combo bonus for streaks!",
    consumes: "problems",
    supportedFormats: ["multiple-choice", "numeric", "true-false"],
    minProblemsToPlay: 5,
  },
  {
    id: "tower-builder",
    name: "Tower Builder",
    icon: "🧱",
    description: "Stack a block for every correct answer.",
    consumes: "problems",
    supportedFormats: ["multiple-choice", "numeric", "true-false"],
    minProblemsToPlay: 1,
  },
  {
    id: "millionaire",
    name: "Millionaire",
    icon: "💰",
    description: "Climb the money ladder — bank your winnings before you slip!",
    consumes: "problems",
    supportedFormats: ["multiple-choice", "numeric", "true-false"],
    minProblemsToPlay: 10,
  },
  {
    id: "math-defense",
    name: "Math Defense",
    icon: "🏰",
    description: "Defend your base — answer fast to defeat enemies!",
    consumes: "problems",
    supportedFormats: ["multiple-choice", "numeric", "true-false"],
    minProblemsToPlay: 10,
  },
  {
    id: "match-master",
    name: "Match Master",
    icon: "🃏",
    description: "Match each problem to its answer — pure memory!",
    consumes: "problems",
    supportedFormats: ["multiple-choice", "numeric"],
    minProblemsToPlay: 6,
  },
  {
    id: "jeopardy",
    name: "Jeopardy",
    icon: "📋",
    description: "Pick a category and a value — high stakes review!",
    consumes: "problems",
    supportedFormats: ["multiple-choice", "numeric", "true-false"],
    minProblemsToPlay: 5,
    multiSet: true,
  },
  {
    id: "word-scramble",
    name: "Word Scramble",
    icon: "🔤",
    description: "Unscramble the letters — vocab practice!",
    consumes: "words",
    minProblemsToPlay: 1,
  },
];

export function getGame(id: string): GameDef | undefined {
  return GAMES.find((g) => g.id === id);
}
