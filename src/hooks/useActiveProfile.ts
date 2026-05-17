import { useCallback, useEffect, useState } from "react";
import { nanoid } from "nanoid";
import {
  getActiveProfileId,
  getProfiles,
  saveProfiles,
  setActiveProfileId,
} from "@/lib/storage";
import type { Grade, KidProfile } from "@/types/profile";

const DAILY_GOAL = 100;

interface UseActiveProfileResult {
  profiles: KidProfile[];
  activeProfile: KidProfile | null;
  selectProfile: (id: string) => void;
  createProfile: (input: {
    name: string;
    grade: Grade;
    avatar: string;
  }) => KidProfile;
  clearActiveProfile: () => void;
  updateActiveProfile: (patch: Partial<KidProfile>) => void;
}

export function useActiveProfile(): UseActiveProfileResult {
  const [profiles, setProfiles] = useState<KidProfile[]>(() =>
    getProfiles().map((p) =>
      p.dailyGoal === DAILY_GOAL ? p : { ...p, dailyGoal: DAILY_GOAL },
    ),
  );
  const [activeId, setActiveId] = useState<string | null>(() =>
    getActiveProfileId(),
  );

  useEffect(() => {
    saveProfiles(profiles);
  }, [profiles]);

  useEffect(() => {
    setActiveProfileId(activeId);
  }, [activeId]);

  const selectProfile = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const createProfile = useCallback(
    ({
      name,
      grade,
      avatar,
    }: {
      name: string;
      grade: Grade;
      avatar: string;
    }): KidProfile => {
      const profile: KidProfile = {
        id: nanoid(8),
        name,
        grade,
        avatar,
        dailyGoal: DAILY_GOAL,
        createdAt: Date.now(),
      };
      setProfiles((prev) => [...prev, profile]);
      setActiveId(profile.id);
      return profile;
    },
    [],
  );

  const clearActiveProfile = useCallback(() => {
    setActiveId(null);
  }, []);

  const updateActiveProfile = useCallback(
    (patch: Partial<KidProfile>) => {
      if (!activeId) return;
      setProfiles((prev) =>
        prev.map((p) => (p.id === activeId ? { ...p, ...patch } : p)),
      );
    },
    [activeId],
  );

  const activeProfile = profiles.find((p) => p.id === activeId) ?? null;

  return {
    profiles,
    activeProfile,
    selectProfile,
    createProfile,
    clearActiveProfile,
    updateActiveProfile,
  };
}
