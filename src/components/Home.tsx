import { useEffect, useState } from "react";
import { loadManifest } from "@/lib/content-loader";
import { GAMES } from "@/lib/games-registry";
import { computeStreak, getTodayProgress } from "@/lib/streaks";
import { getDailyProgress } from "@/lib/storage";
import type {
  ContentManifestEntry,
  QuestionFormat,
} from "@/types/content";
import type { DailyProgress, KidProfile } from "@/types/profile";

interface Props {
  profile: KidProfile;
  onPlay: (entry: ContentManifestEntry, gameId: string) => void;
  onSwitchProfile: () => void;
}

export function Home({ profile, onPlay, onSwitchProfile }: Props) {
  const [sets, setSets] = useState<ContentManifestEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyProgress[]>(() =>
    getDailyProgress(profile.id),
  );

  useEffect(() => {
    setDaily(getDailyProgress(profile.id));
  }, [profile.id]);

  useEffect(() => {
    let cancelled = false;
    loadManifest()
      .then((m) => {
        if (cancelled) return;
        const mine = m.sets.filter((s) => s.grade === profile.grade);
        setSets(mine);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load content");
      });
    return () => {
      cancelled = true;
    };
  }, [profile.grade]);

  const streak = computeStreak(daily);
  const today = getTodayProgress(daily);
  const goalPct = Math.min(
    100,
    Math.round((today.problemsCompleted / profile.dailyGoal) * 100),
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100 p-4">
      <div className="mx-auto max-w-3xl pt-6">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={onSwitchProfile}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            <span className="text-xl leading-none" aria-hidden>
              {profile.avatar}
            </span>
            <span>{profile.name}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500">Switch</span>
          </button>
          <div className="flex items-center gap-2 rounded-full bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-800 shadow-sm">
            <span aria-hidden>🔥</span>
            <span>{streak}-day streak</span>
          </div>
        </header>

        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Today's goal
            </h2>
            <span className="text-sm font-semibold text-slate-600">
              {today.problemsCompleted} / {profile.dailyGoal}
            </span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${
                today.goalMet ? "bg-emerald-500" : "bg-indigo-500"
              }`}
              style={{ width: `${goalPct}%` }}
            />
          </div>
          {today.goalMet && (
            <p className="mt-2 text-sm font-semibold text-emerald-700">
              ✓ Goal met! Keep practicing if you want.
            </p>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-slate-900">
            Hi {profile.name}! Pick a set:
          </h2>

          {error && (
            <p className="mt-4 rounded-xl bg-rose-50 p-4 text-rose-700">
              Couldn't load content: {error}
            </p>
          )}

          {sets === null && !error && (
            <p className="mt-4 text-slate-500">Loading sets…</p>
          )}

          {sets && sets.length === 0 && (
            <p className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-800">
              No sets available for grade {profile.grade} yet. Check back soon!
            </p>
          )}

          {sets && sets.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {sets.map((s) => (
                <SetCard
                  key={s.id}
                  entry={s}
                  onPlay={(gameId) => onPlay(s, gameId)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SetCard({
  entry,
  onPlay,
}: {
  entry: ContentManifestEntry;
  onPlay: (gameId: string) => void;
}) {
  const eligible = GAMES.filter(
    (g) =>
      entry.problemCount >= g.minProblemsToPlay &&
      entry.formats.every((f: QuestionFormat) =>
        g.supportedFormats.includes(f),
      ),
  );

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h3 className="text-lg font-bold text-slate-900">{entry.title}</h3>
      <p className="text-sm text-slate-500">
        {entry.problemCount} problems · Grade {entry.grade}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {eligible.length === 0 ? (
          <p className="text-sm text-slate-400">No compatible games yet.</p>
        ) : (
          eligible.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onPlay(g.id)}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <span aria-hidden className="mr-1">
                {g.icon}
              </span>
              Play {g.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
