import { computeTopicStats, formatRelativeTime, topicLabel } from "@/lib/stats";
import type { ContentManifestEntry } from "@/types/content";
import type { SessionResult } from "@/types/profile";

interface Props {
  sessions: SessionResult[];
  manifest: ContentManifestEntry[];
}

export function TopicStats({ sessions, manifest }: Props) {
  const stats = computeTopicStats(sessions, manifest);

  if (stats.length === 0) {
    return (
      <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
        Play a set to start tracking your progress!
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      {stats.map((s) => {
        const accuracy =
          s.attempted === 0
            ? 0
            : Math.round((s.correct / s.attempted) * 100);
        return (
          <li key={s.topic} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-semibold text-slate-900">
                {topicLabel(s.topic)}
              </div>
              <div className="text-xs text-slate-500">
                {s.attempted} problems · {s.sessions} session{s.sessions === 1 ? "" : "s"}
                {" · "}
                {formatRelativeTime(s.lastPlayed)}
              </div>
            </div>
            <div
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                accuracy >= 80
                  ? "bg-emerald-100 text-emerald-700"
                  : accuracy >= 50
                    ? "bg-amber-100 text-amber-800"
                    : "bg-rose-100 text-rose-700"
              }`}
            >
              {accuracy}%
            </div>
          </li>
        );
      })}
    </ul>
  );
}
