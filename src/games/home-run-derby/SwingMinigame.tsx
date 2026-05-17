import { useEffect, useRef, useState } from "react";
import { classifySwing, type HitResult } from "./hitMath";
import { playCrack } from "@/lib/sounds";

interface Props {
  onSwing: (hit: HitResult) => void;
}

const PITCH_DURATION_MS = 900;
// Layout constants (percentages of the strike-zone container)
const BALL_START = { xPct: 50, yPct: 10, scale: 0.2 };
const BALL_END = { xPct: 50, yPct: 80, scale: 1.0 };
const BALL_DIAMETER_AT_END_PX = 56; // visual ball size when "in the zone"

export function SwingMinigame({ onSwing }: Props) {
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const resolvedRef = useRef(false);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);

  // Auto-resolve as whiff if the pitch passes without a swing.
  useEffect(() => {
    startedAtRef.current = Date.now();
    resolvedRef.current = false;
    const id = window.setTimeout(() => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      onSwing({ kind: "whiff" });
    }, PITCH_DURATION_MS + 80); // small grace to avoid double-resolution race
    return () => window.clearTimeout(id);
  }, [onSwing]);

  function ballPositionNow(zoneRect: DOMRect): {
    x: number;
    y: number;
    radius: number;
  } {
    const tRaw = (Date.now() - startedAtRef.current) / PITCH_DURATION_MS;
    const t = Math.max(0, Math.min(1, tRaw));
    // ease-out: 1 - (1-t)^2
    const eased = 1 - (1 - t) * (1 - t);
    const xPct = BALL_START.xPct + (BALL_END.xPct - BALL_START.xPct) * eased;
    const yPct = BALL_START.yPct + (BALL_END.yPct - BALL_START.yPct) * eased;
    const scale = BALL_START.scale + (BALL_END.scale - BALL_START.scale) * eased;
    const x = zoneRect.left + (zoneRect.width * xPct) / 100;
    const y = zoneRect.top + (zoneRect.height * yPct) / 100;
    const radius = (BALL_DIAMETER_AT_END_PX / 2) * scale;
    return { x, y, radius };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!zoneRef.current) return;
    const rect = zoneRef.current.getBoundingClientRect();
    const clampedX = Math.max(rect.left, Math.min(rect.right, e.clientX));
    const clampedY = Math.max(rect.top, Math.min(rect.bottom, e.clientY));
    pointerRef.current = { x: clampedX, y: clampedY };
    setCrosshair({
      x: clampedX - rect.left,
      y: clampedY - rect.top,
    });
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (resolvedRef.current || !zoneRef.current) return;
    const rect = zoneRef.current.getBoundingClientRect();
    const clampedX = Math.max(rect.left, Math.min(rect.right, e.clientX));
    const clampedY = Math.max(rect.top, Math.min(rect.bottom, e.clientY));
    const ball = ballPositionNow(rect);
    const elapsed = Date.now() - startedAtRef.current;
    // Early swing — before the ball is meaningfully in the zone → whiff.
    if (elapsed < PITCH_DURATION_MS * 0.35) {
      resolvedRef.current = true;
      onSwing({ kind: "whiff" });
      return;
    }
    const hit = classifySwing({
      clickX: clampedX,
      clickY: clampedY,
      ballX: ball.x,
      ballY: ball.y,
      ballRadius: ball.radius,
    });
    resolvedRef.current = true;
    if (hit.kind !== "whiff") playCrack();
    onSwing(hit);
  }

  return (
    <div className="mt-6 flex justify-center">
      <div
        ref={zoneRef}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        className="relative h-[320px] w-[320px] cursor-crosshair touch-none rounded-xl border-2 border-dashed border-yellow-300/70 bg-slate-900/30"
      >
        {/* Pitcher mound silhouette (top-center) */}
        <div className="absolute left-1/2 top-2 h-4 w-16 -translate-x-1/2 rounded-full bg-amber-700/60" />
        <div className="absolute left-1/2 top-0 h-6 w-3 -translate-x-1/2 rounded-sm bg-slate-700" />

        {/* The ball — CSS transition for smoothness; position is derived from the timer for click-time calcs */}
        <Ball />

        {/* Crosshair follows pointer */}
        {crosshair && (
          <div
            className="pointer-events-none absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow-300"
            style={{ left: crosshair.x, top: crosshair.y }}
          >
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-300" />
          </div>
        )}
      </div>
    </div>
  );
}

function Ball() {
  // The ball uses a CSS transition from start → end over PITCH_DURATION_MS.
  // We rely on react re-render flow: render once at start values, then on next tick swap to end values.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // requestAnimationFrame ensures the browser registers the initial state before transitioning.
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const xPct = mounted ? BALL_END.xPct : BALL_START.xPct;
  const yPct = mounted ? BALL_END.yPct : BALL_START.yPct;
  const scale = mounted ? BALL_END.scale : BALL_START.scale;
  return (
    <div
      className="pointer-events-none absolute h-14 w-14 rounded-full border-2 border-red-700 bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)]"
      style={{
        left: `${xPct}%`,
        top: `${yPct}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transition: `left ${PITCH_DURATION_MS}ms ease-out, top ${PITCH_DURATION_MS}ms ease-out, transform ${PITCH_DURATION_MS}ms ease-out`,
      }}
    />
  );
}
