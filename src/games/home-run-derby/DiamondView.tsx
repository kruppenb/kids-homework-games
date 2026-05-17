import { useEffect, useState } from "react";
import { playCheer } from "@/lib/sounds";
import type { HitResult, Runners } from "./hitMath";

interface Props {
  hit: HitResult;
  runsScored: number;
  // Runners AFTER advancement — DiamondView animates them from their pre-hit positions to here.
  runnersAfter: Runners;
  runnersBefore: Runners;
  /** Was this outcome a strikeout (out)? Distinguishes "OUT" banner from "STRIKE" banner. */
  wasOut: boolean;
}

type Base = "home" | "first" | "second" | "third";

const BASE_POSITION: Record<Base, { left: string; top: string }> = {
  home: { left: "50%", top: "82%" },
  first: { left: "78%", top: "55%" },
  second: { left: "50%", top: "28%" },
  third: { left: "22%", top: "55%" },
};

export function DiamondView({
  hit,
  runsScored,
  runnersAfter,
  runnersBefore,
  wasOut,
}: Props) {
  const [showBall, setShowBall] = useState(false);
  const [showRunners, setShowRunners] = useState(false);

  useEffect(() => {
    if (runsScored > 0) playCheer();
    // Show the ball arc first, then runners after a short delay.
    const t1 = window.setTimeout(() => setShowBall(true), 30);
    const t2 = window.setTimeout(() => setShowRunners(true), 400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [hit, runsScored]);

  const banner = bannerFor(hit, wasOut);
  const landing = landingFor(hit);

  return (
    <div className="mt-6 flex justify-center">
      <div className="relative h-[320px] w-[320px] rounded-3xl bg-green-700 ring-2 ring-green-900">
        {/* Outfield arc */}
        <div className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30" />
        {/* Infield diamond (rotated square) */}
        <div className="absolute left-1/2 top-1/2 h-[130px] w-[130px] -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-white/70 bg-amber-700/70" />
        {/* Bases */}
        {(Object.keys(BASE_POSITION) as Base[]).map((b) => (
          <div
            key={b}
            className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-white"
            style={BASE_POSITION[b]}
          />
        ))}

        {/* Ball: travels from home to landing point */}
        <div
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-700 bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]"
          style={{
            left: showBall ? landing.left : BASE_POSITION.home.left,
            top: showBall ? landing.top : BASE_POSITION.home.top,
            transition: "left 700ms ease-out, top 700ms ease-out",
          }}
        />

        {/* Runners before/after — render dots for each base that is/was occupied. */}
        {renderRunner("first", runnersBefore.first, runnersAfter.first, showRunners)}
        {renderRunner("second", runnersBefore.second, runnersAfter.second, showRunners)}
        {renderRunner("third", runnersBefore.third, runnersAfter.third, showRunners)}

        {/* Banner */}
        <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-md bg-yellow-300 px-3 py-1 text-sm font-extrabold text-slate-900 shadow">
          {banner}
          {runsScored > 0 ? ` +${runsScored}` : ""}
        </div>
      </div>
    </div>
  );
}

function renderRunner(
  base: Base,
  before: boolean,
  after: boolean,
  show: boolean,
) {
  // Three cases worth visualising:
  //   - Stayed: render once on this base.
  //   - Was here, no longer: render once on this base (will fade/move out next animation tick).
  //   - Arrived: render at this base only after the runner animation tick.
  if (!before && !after) return null;
  // Initial frame: render where they started. After the `show` flip, only
  // render if they're still on that base (otherwise they advanced or scored).
  if (show && !after) return null;
  if (!show && !before) return null;
  return (
    <div
      key={base}
      className="pointer-events-none absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-yellow-300 text-xs ring-2 ring-slate-900 transition-all duration-500"
      style={BASE_POSITION[base]}
    >
      🧒
    </div>
  );
}

function bannerFor(hit: HitResult, wasOut: boolean): string {
  if (wasOut) return "OUT";
  switch (hit.kind) {
    case "homerun":
      return "HOME RUN!";
    case "triple":
      return "TRIPLE!";
    case "double":
      return "DOUBLE!";
    case "single":
      return hit.weak ? "WEAK SINGLE" : "SINGLE!";
    case "whiff":
      return "STRIKE!";
  }
}

function landingFor(hit: HitResult): { left: string; top: string } {
  // Land near the appropriate base for a quick visual; HR sails past 2B (top center).
  switch (hit.kind) {
    case "homerun":
      return { left: "50%", top: "8%" };
    case "triple":
      return { left: "20%", top: "20%" };
    case "double":
      return BASE_POSITION.second;
    case "single":
      return { left: "65%", top: "45%" };
    case "whiff":
      return BASE_POSITION.home;
  }
}
