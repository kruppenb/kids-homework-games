import { todayKey } from "@/lib/streaks";
import type { DailyProgress } from "@/types/profile";

const DAYS = 14;

interface Props {
  entries: DailyProgress[];
  dailyGoal: number;
}

export function StreakHeatmap({ entries, dailyGoal }: Props) {
  const today = todayKey();
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const cells: { date: string; entry: DailyProgress | undefined; isToday: boolean }[] = [];
  const todayDate = parseDate(today);
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - i);
    const key = formatKey(d);
    cells.push({ date: key, entry: byDate.get(key), isToday: key === today });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Last 2 weeks</h2>
        <Legend />
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {cells.map((c) => (
          <DayCell key={c.date} cell={c} dailyGoal={dailyGoal} />
        ))}
      </div>
    </div>
  );
}

function DayCell({
  cell,
  dailyGoal,
}: {
  cell: { date: string; entry: DailyProgress | undefined; isToday: boolean };
  dailyGoal: number;
}) {
  const intensity = cell.entry
    ? cell.entry.goalMet
      ? 3
      : cell.entry.problemsCompleted >= Math.ceil(dailyGoal / 2)
        ? 2
        : cell.entry.problemsCompleted > 0
          ? 1
          : 0
    : 0;
  const colorClass =
    intensity === 3
      ? "bg-emerald-500"
      : intensity === 2
        ? "bg-emerald-300"
        : intensity === 1
          ? "bg-emerald-100"
          : "bg-slate-100";
  const day = parseDate(cell.date).getDate();
  return (
    <div
      title={`${cell.date}: ${cell.entry?.problemsCompleted ?? 0} problems`}
      className={`flex aspect-square items-center justify-center rounded-md text-xs font-semibold ${colorClass} ${
        cell.isToday ? "ring-2 ring-indigo-500" : ""
      } ${intensity >= 2 ? "text-white" : "text-slate-500"}`}
    >
      {day}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-500">
      <span>less</span>
      <div className="h-3 w-3 rounded bg-slate-100" />
      <div className="h-3 w-3 rounded bg-emerald-100" />
      <div className="h-3 w-3 rounded bg-emerald-300" />
      <div className="h-3 w-3 rounded bg-emerald-500" />
      <span>more</span>
    </div>
  );
}

function parseDate(key: string): Date {
  const [y, m, d] = key.split("-").map((n) => Number.parseInt(n, 10));
  return new Date(y, m - 1, d);
}

function formatKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
