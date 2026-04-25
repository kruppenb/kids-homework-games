import { useState } from "react";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { ProfilePicker } from "@/components/ProfilePicker";
import { Home } from "@/components/Home";
import { UnlockBanner } from "@/components/UnlockBanner";
import { QuizShowdown } from "@/games/quiz-showdown";
import { SpeedRun } from "@/games/speed-run";
import { TowerBuilder } from "@/games/tower-builder";
import { loadProblemSet } from "@/lib/content-loader";
import { addSession } from "@/lib/storage";
import { recordSessionInDailyProgress } from "@/lib/streaks";
import { newlyUnlocked, type AvatarTier } from "@/lib/avatars";
import { playLevelUp } from "@/lib/sounds";
import type {
  ContentManifestEntry,
  ProblemSet,
} from "@/types/content";
import type { SessionResult } from "@/types/profile";

type View =
  | { kind: "home" }
  | { kind: "loading-set"; entry: ContentManifestEntry; gameId: string }
  | { kind: "playing"; set: ProblemSet; gameId: string };

export default function App() {
  const {
    profiles,
    activeProfile,
    selectProfile,
    createProfile,
    clearActiveProfile,
    updateActiveProfile,
  } = useActiveProfile();

  const [view, setView] = useState<View>({ kind: "home" });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingUnlocks, setPendingUnlocks] = useState<AvatarTier[]>([]);

  if (!activeProfile) {
    return (
      <ProfilePicker
        profiles={profiles}
        onSelect={selectProfile}
        onCreate={createProfile}
      />
    );
  }

  function handlePlay(entry: ContentManifestEntry, gameId: string) {
    setLoadError(null);
    setView({ kind: "loading-set", entry, gameId });
    loadProblemSet(entry)
      .then((set) => setView({ kind: "playing", set, gameId }))
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load set");
        setView({ kind: "home" });
      });
  }

  function handleComplete(result: SessionResult) {
    if (!activeProfile) return;
    addSession(result);
    const { prevStreak, newStreak } = recordSessionInDailyProgress(
      activeProfile,
      result,
    );
    const unlocks = newlyUnlocked(prevStreak, newStreak);
    if (unlocks.length > 0) {
      const existing = activeProfile.unlockedAvatars ?? [];
      const merged = [...existing];
      for (const u of unlocks) {
        if (!merged.includes(u.emoji)) merged.push(u.emoji);
      }
      updateActiveProfile({ unlockedAvatars: merged });
      setPendingUnlocks(unlocks);
      playLevelUp();
    }
  }

  function handleExitGame() {
    setView({ kind: "home" });
  }

  if (view.kind === "loading-set") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading set…</p>
      </div>
    );
  }

  if (view.kind === "playing") {
    const common = {
      set: view.set,
      profileId: activeProfile.id,
      onExit: handleExitGame,
      onComplete: handleComplete,
    };
    if (view.gameId === "speed-run") return <SpeedRun {...common} />;
    if (view.gameId === "tower-builder") return <TowerBuilder {...common} />;
    return <QuizShowdown {...common} />;
  }

  return (
    <>
      {loadError && (
        <div className="bg-rose-100 p-2 text-center text-sm text-rose-700">
          {loadError}
        </div>
      )}
      <UnlockBanner
        unlocks={pendingUnlocks}
        onDismiss={() => setPendingUnlocks([])}
      />
      <Home
        profile={activeProfile}
        onPlay={handlePlay}
        onSwitchProfile={clearActiveProfile}
        onUpdateProfile={updateActiveProfile}
      />
    </>
  );
}
