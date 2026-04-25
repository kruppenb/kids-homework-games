import { useEffect, useState } from "react";
import { loadManifest } from "@/lib/content-loader";
import { GAMES } from "@/lib/games-registry";
import { computeStreak, getTodayProgress } from "@/lib/streaks";
import { getDailyProgress, getSessions } from "@/lib/storage";
import { isMuted, setMuted } from "@/lib/sounds";
import type {
  ContentManifest,
  ContentManifestEntry,
  QuestionFormat,
} from "@/types/content";
import type { DailyProgress, KidProfile, SessionResult } from "@/types/profile";
import { StreakHeatmap } from "@/components/StreakHeatmap";
import { TopicStats } from "@/components/TopicStats";
import { AvatarPickerModal } from "@/components/AvatarPickerModal";

interface Props {
  profile: KidProfile;
  onPlay: (entry: ContentManifestEntry, gameId: string) => void;
  onSwitchProfile: () => void;
  onUpdateProfile: (patch: Partial<KidProfile>) => void;
}

export function Home({
  profile,
  onPlay,
  onSwitchProfile,
  onUpdateProfile,
}: Props) {
  const [manifest, setManifest] = useState<ContentManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyProgress[]>(() =>
    getDailyProgress(profile.id),
  );
  const [sessions, setSessions] = useState<SessionResult[]>(() =>
    getSessions(profile.id),
  );
  const [muted, setMutedState] = useState<boolean>(() => isMuted());
  const [editingAvatar, setEditingAvatar] = useState(false);

  useEffect(() => {
    setDaily(getDailyProgress(profile.id));
    setSessions(getSessions(profile.id));
  }, [profile.id]);

  useEffect(() => {
    let cancelled = false;
    loadManifest()
      .then((m) => {
        if (cancelled) return;
        setManifest(m);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load content");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sets = manifest
    ? manifest.sets.filter((s) => s.grade === profile.grade)
    : null;
  const streak = computeStreak(daily);
  const today = getTodayProgress(daily);
  const goalPct = Math.min(
    100,
    Math.round((today.problemsCompleted / profile.dailyGoal) * 100),
  );

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100 p-4 pb-12">
      <div className="mx-auto max-w-3xl pt-6">
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 rounded-full bg-white px-2 py-1 shadow-sm ring-1 ring-slate-200">
            <button
              type="button"
              onClick={() => setEditingAvatar(true)}
              className="rounded-full p-1 text-2xl leading-none transition hover:bg-slate-100"
              aria-label="Change avatar"
            >
              {profile.avatar}
            </button>
            <span className="text-sm font-semibold text-slate-700">
              {profile.name}
            </span>
            <button
              type="button"
              onClick={onSwitchProfile}
              className="ml-1 rounded-full px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
            >
              Switch
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className="rounded-full bg-white p-2 text-lg shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
            >
              {muted ? "🔇" : "🔊"}
            </button>
            <div className="flex items-center gap-2 rounded-full bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-800 shadow-sm">
              <span aria-hidden>🔥</span>
              <span>{streak}-day streak</span>
            </div>
          </div>
        </header>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Today's goal</h2>
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

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <StreakHeatmap entries={daily} dailyGoal={profile.dailyGoal} />
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-bold text-slate-900">Your progress</h2>
          <div className="mt-3">
            <TopicStats
              sessions={sessions}
              manifest={manifest?.sets ?? []}
            />
          </div>
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

      {editingAvatar && (
        <AvatarPickerModal
          current={profile.avatar}
          unlockedAvatars={profile.unlockedAvatars}
          onPick={(a) => {
            onUpdateProfile({ avatar: a });
            setEditingAvatar(false);
          }}
          onClose={() => setEditingAvatar(false)}
        />
      )}
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
              className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <span aria-hidden className="mr-1">
                {g.icon}
              </span>
              {g.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
