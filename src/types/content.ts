import { z } from "zod";
import { GradeSchema } from "./profile";

export const SubjectSchema = z.enum(["math", "spelling", "reading", "vocab"]);
export type Subject = z.infer<typeof SubjectSchema>;

export const QuestionFormatSchema = z.enum([
  "multiple-choice",
  "numeric",
  "fill-blank",
  "true-false",
]);
export type QuestionFormat = z.infer<typeof QuestionFormatSchema>;

const BaseProblem = z.object({
  id: z.string(),
  prompt: z.string().min(1),
  explanation: z.string().optional(),
  hint: z.string().optional(),
});

export const MultipleChoiceProblemSchema = BaseProblem.extend({
  format: z.literal("multiple-choice"),
  options: z.array(z.string().min(1)).min(2).max(4),
  correctIndex: z.number().int().nonnegative(),
});

export const NumericProblemSchema = BaseProblem.extend({
  format: z.literal("numeric"),
  answer: z.number(),
  tolerance: z.number().optional(),
});

export const FillBlankProblemSchema = BaseProblem.extend({
  format: z.literal("fill-blank"),
  answer: z.string().min(1),
  acceptableAnswers: z.array(z.string()).optional(),
});

export const TrueFalseProblemSchema = BaseProblem.extend({
  format: z.literal("true-false"),
  answer: z.boolean(),
});

export const ProblemSchema = z.discriminatedUnion("format", [
  MultipleChoiceProblemSchema,
  NumericProblemSchema,
  FillBlankProblemSchema,
  TrueFalseProblemSchema,
]);
export type Problem = z.infer<typeof ProblemSchema>;
export type MultipleChoiceProblem = z.infer<typeof MultipleChoiceProblemSchema>;
export type NumericProblem = z.infer<typeof NumericProblemSchema>;
export type FillBlankProblem = z.infer<typeof FillBlankProblemSchema>;
export type TrueFalseProblem = z.infer<typeof TrueFalseProblemSchema>;

export const ProblemSetSchema = z.object({
  id: z.string(),
  subject: SubjectSchema,
  grade: GradeSchema,
  title: z.string().min(1),
  topic: z.string().optional(),
  problems: z.array(ProblemSchema).min(1),
});
export type ProblemSet = z.infer<typeof ProblemSetSchema>;

export const ContentManifestEntrySchema = z.object({
  id: z.string(),
  subject: SubjectSchema,
  grade: GradeSchema,
  title: z.string(),
  topic: z.string().optional(),
  path: z.string(),
  problemCount: z.number().int().positive(),
  formats: z.array(QuestionFormatSchema),
});
export type ContentManifestEntry = z.infer<typeof ContentManifestEntrySchema>;

export const ContentManifestSchema = z.object({
  sets: z.array(ContentManifestEntrySchema),
});
export type ContentManifest = z.infer<typeof ContentManifestSchema>;

export interface GameDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  supportedFormats: QuestionFormat[];
  minProblemsToPlay: number;
}
