import { useState } from "react";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { ProfilePicker } from "@/components/ProfilePicker";
import { Home } from "@/components/Home";
import { QuizShowdown } from "@/games/quiz-showdown";
import { loadProblemSet } from "@/lib/content-loader";
import { addSession } from "@/lib/storage";
import { recordSessionInDailyProgress } from "@/lib/streaks";
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
  } = useActiveProfile();

  const [view, setView] = useState<View>({ kind: "home" });
  const [loadError, setLoadError] = useState<string | null>(null);

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
    recordSessionInDailyProgress(activeProfile, result);
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
    return (
      <QuizShowdown
        set={view.set}
        profileId={activeProfile.id}
        onExit={handleExitGame}
        onComplete={handleComplete}
      />
    );
  }

  return (
    <>
      {loadError && (
        <div className="bg-rose-100 p-2 text-center text-sm text-rose-700">
          {loadError}
        </div>
      )}
      <Home
        profile={activeProfile}
        onPlay={handlePlay}
        onSwitchProfile={clearActiveProfile}
      />
    </>
  );
}
