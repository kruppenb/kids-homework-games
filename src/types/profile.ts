import { z } from "zod";

export const GradeSchema = z.enum(["1", "2", "3", "4", "5"]);
export type Grade = z.infer<typeof GradeSchema>;

export const KidProfileSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  grade: GradeSchema,
  avatar: z.string(),
  dailyGoal: z.number().int().positive(),
  createdAt: z.number(),
  unlockedAvatars: z.array(z.string()).optional(),
});
export type KidProfile = z.infer<typeof KidProfileSchema>;

export const DailyProgressSchema = z.object({
  date: z.string(),
  problemsCompleted: z.number().int().nonnegative(),
  goalMet: z.boolean(),
});
export type DailyProgress = z.infer<typeof DailyProgressSchema>;

export const SessionResultSchema = z.object({
  profileId: z.string(),
  setId: z.string(),
  gameId: z.string(),
  completedAt: z.number(),
  problemsAttempted: z.number().int().nonnegative(),
  problemsCorrect: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
});
export type SessionResult = z.infer<typeof SessionResultSchema>;
