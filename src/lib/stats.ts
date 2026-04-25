import type { ContentManifestEntry } from "@/types/content";
import type { SessionResult } from "@/types/profile";

export interface TopicStats {
  topic: string;
  attempted: number;
  correct: number;
  lastPlayed: number;
  sessions: number;
}

export function computeTopicStats(
  sessions: SessionResult[],
  manifest: ContentManifestEntry[],
): TopicStats[] {
  const setIdToTopic = new Map<string, string>();
  for (const m of manifest) {
    setIdToTopic.set(m.id, m.topic ?? m.subject);
  }
  const buckets = new Map<string, TopicStats>();
  for (const s of sessions) {
    const topic = setIdToTopic.get(s.setId);
    if (!topic) continue;
    const cur = buckets.get(topic) ?? {
      topic,
      attempted: 0,
      correct: 0,
      lastPlayed: 0,
      sessions: 0,
    };
    cur.attempted += s.problemsAttempted;
    cur.correct += s.problemsCorrect;
    cur.lastPlayed = Math.max(cur.lastPlayed, s.completedAt);
    cur.sessions += 1;
    buckets.set(topic, cur);
  }
  return [...buckets.values()].sort((a, b) => b.lastPlayed - a.lastPlayed);
}

export function formatRelativeTime(epochMs: number, now = Date.now()): string {
  const diff = now - epochMs;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  return `${wk}w ago`;
}

export function topicLabel(topic: string): string {
  return topic
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
