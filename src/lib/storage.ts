import type { ZodType } from "zod";
import {
  KidProfileSchema,
  DailyProgressSchema,
  SessionResultSchema,
  type KidProfile,
  type DailyProgress,
  type SessionResult,
} from "@/types/profile";
import { z } from "zod";

const KEY_PROFILES = "khg:profiles";
const KEY_ACTIVE_PROFILE = "khg:activeProfile";
const sessionsKey = (profileId: string) => `khg:sessions:${profileId}`;
const dailyKey = (profileId: string) => `khg:daily:${profileId}`;

function read<T>(key: string, schema: ZodType<T>, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return schema.parse(parsed);
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

const ProfilesArraySchema = z.array(KidProfileSchema);
const SessionsArraySchema = z.array(SessionResultSchema);
const DailyArraySchema = z.array(DailyProgressSchema);

export function getProfiles(): KidProfile[] {
  return read(KEY_PROFILES, ProfilesArraySchema, []);
}

export function saveProfiles(profiles: KidProfile[]): void {
  write(KEY_PROFILES, profiles);
}

export function getActiveProfileId(): string | null {
  const raw = localStorage.getItem(KEY_ACTIVE_PROFILE);
  return raw ?? null;
}

export function setActiveProfileId(id: string | null): void {
  if (id === null) localStorage.removeItem(KEY_ACTIVE_PROFILE);
  else localStorage.setItem(KEY_ACTIVE_PROFILE, id);
}

export function getSessions(profileId: string): SessionResult[] {
  return read(sessionsKey(profileId), SessionsArraySchema, []);
}

export function addSession(result: SessionResult): void {
  const existing = getSessions(result.profileId);
  const updated = [...existing, result].slice(-500);
  write(sessionsKey(result.profileId), updated);
}

export function getDailyProgress(profileId: string): DailyProgress[] {
  return read(dailyKey(profileId), DailyArraySchema, []);
}

export function saveDailyProgress(
  profileId: string,
  entries: DailyProgress[],
): void {
  write(dailyKey(profileId), entries.slice(-60));
}
