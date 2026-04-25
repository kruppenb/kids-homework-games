import { useState } from "react";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { ProfilePicker } from "@/components/ProfilePicker";
import { Home } from "@/components/Home";
import { UnlockBanner } from "@/components/UnlockBanner";
import { QuizShowdown } from "@/games/quiz-showdown";
import { SpeedRun } from "@/games/speed-run";
import { TowerBuilder } from "@/games/tower-builder";
import { Millionaire } from "@/games/millionaire";
import { MathDefense } from "@/games/math-defense";
import { MatchMaster } from "@/games/match-master";
import { Jeopardy } from "@/games/jeopardy";
import { WordScramble } from "@/games/word-scramble";
import {
  loadManifest,
  loadProblemSet,
  loadWordSet,
} from "@/lib/content-loader";
import { addSession } from "@/lib/storage";
import { recordSessionInDailyProgress } from "@/lib/streaks";
import { newlyUnlocked, type AvatarTier } from "@/lib/avatars";
import { playLevelUp } from "@/lib/sounds";
import { getGame } from "@/lib/games-registry";
import type {
  ContentManifestEntry,
  ProblemSet,
  WordSet,
} from "@/types/content";
import type { SessionResult } from "@/types/profile";

type View =
  | { kind: "home" }
  | { kind: "loading"; gameId: string }
  | { kind: "playing-problem"; set: ProblemSet; gameId: string }
  | { kind: "playing-word"; set: WordSet; gameId: string }
  | { kind: "playing-multi"; sets: ProblemSet[]; gameId: string };

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
    setView({ kind: "loading", gameId });
    const game = getGame(gameId);
    if (!game) {
      setLoadError(`Unknown game: ${gameId}`);
      setView({ kind: "home" });
      return;
    }
    if (game.consumes === "words") {
      loadWordSet(entry)
        .then((set) => setView({ kind: "playing-word", set, gameId }))
        .catch((e: unknown) => {
          setLoadError(e instanceof Error ? e.message : "Failed to load set");
          setView({ kind: "home" });
        });
      return;
    }
    loadProblemSet(entry)
      .then((set) => setView({ kind: "playing-problem", set, gameId }))
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load set");
        setView({ kind: "home" });
      });
  }

  function handlePlayMulti(gameId: string) {
    if (!activeProfile) return;
    setLoadError(null);
    setView({ kind: "loading", gameId });
    loadManifest()
      .then(async (m) => {
        const eligible = m.sets.filter(
          (s) => s.kind === "problems" && s.grade === activeProfile.grade,
        );
        const sets = await Promise.all(eligible.map((e) => loadProblemSet(e)));
        if (sets.length === 0) {
          throw new Error("No problem sets available for this grade.");
        }
        setView({ kind: "playing-multi", sets, gameId });
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load sets");
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

  if (view.kind === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  if (view.kind === "playing-problem") {
    const common = {
      set: view.set,
      profileId: activeProfile.id,
      onExit: handleExitGame,
      onComplete: handleComplete,
    };
    if (view.gameId === "speed-run") return <SpeedRun {...common} />;
    if (view.gameId === "tower-builder") return <TowerBuilder {...common} />;
    if (view.gameId === "millionaire") return <Millionaire {...common} />;
    if (view.gameId === "math-defense") return <MathDefense {...common} />;
    if (view.gameId === "match-master") return <MatchMaster {...common} />;
    return <QuizShowdown {...common} />;
  }

  if (view.kind === "playing-word") {
    return (
      <WordScramble
        set={view.set}
        profileId={activeProfile.id}
        onExit={handleExitGame}
        onComplete={handleComplete}
      />
    );
  }

  if (view.kind === "playing-multi") {
    if (view.gameId === "jeopardy") {
      return (
        <Jeopardy
          sets={view.sets}
          profileId={activeProfile.id}
          onExit={handleExitGame}
          onComplete={handleComplete}
        />
      );
    }
    setView({ kind: "home" });
    return null;
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
        onPlayMulti={handlePlayMulti}
        onSwitchProfile={clearActiveProfile}
        onUpdateProfile={updateActiveProfile}
      />
    </>
  );
}
