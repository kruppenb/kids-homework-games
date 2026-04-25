import {
  getDailyProgress,
  saveDailyProgress,
} from "@/lib/storage";
import type { DailyProgress, KidProfile, SessionResult } from "@/types/profile";

export function todayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayOffsetKey(key: string, offset: number): string {
  const [y, m, d] = key.split("-").map((n) => Number.parseInt(n, 10));
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + offset);
  return todayKey(date);
}

export function computeStreak(
  entries: DailyProgress[],
  today = todayKey(),
): number {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  let streak = 0;
  let cursor = dayOffsetKey(today, -1);
  while (true) {
    const e = byDate.get(cursor);
    if (!e || !e.goalMet) break;
    streak++;
    cursor = dayOffsetKey(cursor, -1);
  }
  const todayEntry = byDate.get(today);
  if (todayEntry?.goalMet) streak++;
  return streak;
}

export function getTodayProgress(entries: DailyProgress[]): DailyProgress {
  const today = todayKey();
  return (
    entries.find((e) => e.date === today) ?? {
      date: today,
      problemsCompleted: 0,
      goalMet: false,
    }
  );
}

export interface SessionRecordResult {
  daily: DailyProgress[];
  prevStreak: number;
  newStreak: number;
}

export function recordSessionInDailyProgress(
  profile: KidProfile,
  session: SessionResult,
): SessionRecordResult {
  const existing = getDailyProgress(profile.id);
  const prevStreak = computeStreak(existing);
  const today = todayKey();
  const currentToday = existing.find((e) => e.date === today);
  const nextToday: DailyProgress = {
    date: today,
    problemsCompleted:
      (currentToday?.problemsCompleted ?? 0) + session.problemsAttempted,
    goalMet: false,
  };
  nextToday.goalMet = nextToday.problemsCompleted >= profile.dailyGoal;
  const updated = [
    ...existing.filter((e) => e.date !== today),
    nextToday,
  ].sort((a, b) => a.date.localeCompare(b.date));
  saveDailyProgress(profile.id, updated);
  const newStreak = computeStreak(updated);
  return { daily: updated, prevStreak, newStreak };
}
