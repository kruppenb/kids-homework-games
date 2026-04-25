export const BASE_AVATARS = [
  "🦊",
  "🐼",
  "🦁",
  "🐸",
  "🦄",
  "🐙",
  "🦖",
  "🐳",
  "🦉",
  "🐯",
];

export interface AvatarTier {
  emoji: string;
  streakRequired: number;
  label: string;
}

export const UNLOCKABLE_AVATARS: AvatarTier[] = [
  { emoji: "🐉", streakRequired: 3, label: "3-day streak" },
  { emoji: "🦅", streakRequired: 7, label: "7-day streak" },
  { emoji: "🚀", streakRequired: 14, label: "2-week streak" },
  { emoji: "🌟", streakRequired: 30, label: "1-month streak" },
  { emoji: "👑", streakRequired: 50, label: "50-day streak" },
  { emoji: "🏆", streakRequired: 100, label: "100-day streak" },
];

export function newlyUnlocked(
  prevStreak: number,
  newStreak: number,
): AvatarTier[] {
  return UNLOCKABLE_AVATARS.filter(
    (t) => prevStreak < t.streakRequired && newStreak >= t.streakRequired,
  );
}

export function availableAvatars(
  unlockedAvatars: string[] | undefined,
): string[] {
  return [...BASE_AVATARS, ...(unlockedAvatars ?? [])];
}
