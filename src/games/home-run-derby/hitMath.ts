export type HitResult =
  | { kind: "homerun" }
  | { kind: "triple" }
  | { kind: "double" }
  | { kind: "single"; weak: boolean }
  | { kind: "whiff" };

export interface Runners {
  first: boolean;
  second: boolean;
  third: boolean;
}

export function classifySwing(args: {
  clickX: number;
  clickY: number;
  ballX: number;
  ballY: number;
  ballRadius: number;
}): HitResult {
  const dx = args.clickX - args.ballX;
  const dy = args.clickY - args.ballY;
  const d = Math.sqrt(dx * dx + dy * dy) / args.ballRadius;
  if (d > 1) return { kind: "whiff" };
  if (d < 0.15) return { kind: "homerun" };
  if (d < 0.35) return { kind: "triple" };
  if (d < 0.6) return { kind: "double" };
  if (d < 0.85) return { kind: "single", weak: false };
  return { kind: "single", weak: true };
}

/**
 * Move the batter and existing runners based on the hit, count runs.
 * Existing runners advance the same number of bases as the batter,
 * EXCEPT on singles: normal singles advance runners 2 bases (so a
 * runner on 2B scores); weak singles advance them only 1 base.
 */
export function advanceRunners(args: {
  runners: Runners;
  hit: HitResult;
}): { runners: Runners; runsScored: number } {
  const { runners, hit } = args;
  if (hit.kind === "whiff") {
    return { runners, runsScored: 0 };
  }

  const batterBases = hit.kind === "homerun"
    ? 4
    : hit.kind === "triple"
      ? 3
      : hit.kind === "double"
        ? 2
        : 1;
  // A normal single advances existing runners 2 bases; a weak single only 1.
  // Other hits move existing runners the same number of bases as the batter.
  const runnerBases = hit.kind === "single"
    ? hit.weak
      ? 1
      : 2
    : batterBases;

  type Slot = { startBase: 0 | 1 | 2 | 3; advance: number };
  const movers: Slot[] = [{ startBase: 0, advance: batterBases }];
  if (runners.first) movers.push({ startBase: 1, advance: runnerBases });
  if (runners.second) movers.push({ startBase: 2, advance: runnerBases });
  if (runners.third) movers.push({ startBase: 3, advance: runnerBases });

  let runsScored = 0;
  const next: Runners = { first: false, second: false, third: false };

  for (const { startBase, advance } of movers) {
    const endBase = startBase + advance;
    if (endBase >= 4) {
      runsScored += 1;
    } else if (endBase === 1) {
      next.first = true;
    } else if (endBase === 2) {
      next.second = true;
    } else if (endBase === 3) {
      next.third = true;
    }
  }

  return { runners: next, runsScored };
}
