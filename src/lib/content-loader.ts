import {
  ContentManifestSchema,
  ProblemSetSchema,
  WordSetSchema,
  type ContentManifest,
  type ContentManifestEntry,
  type ProblemSet,
  type WordSet,
} from "@/types/content";

const manifestCache = new Map<string, ContentManifest>();
const setCache = new Map<string, ProblemSet>();
const wordCache = new Map<string, WordSet>();

function withBase(path: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  if (base.endsWith("/") && path.startsWith("/")) {
    return base + path.slice(1);
  }
  return base + path;
}

export async function loadManifest(): Promise<ContentManifest> {
  const cached = manifestCache.get("manifest");
  if (cached) return cached;
  const resp = await fetch(withBase("/content/index.json"));
  if (!resp.ok) throw new Error(`Content manifest HTTP ${resp.status}`);
  const raw = (await resp.json()) as unknown;
  const parsed = ContentManifestSchema.parse(raw);
  manifestCache.set("manifest", parsed);
  return parsed;
}

export async function loadProblemSet(
  entry: ContentManifestEntry,
): Promise<ProblemSet> {
  const cached = setCache.get(entry.id);
  if (cached) return cached;
  const resp = await fetch(withBase(entry.path));
  if (!resp.ok) throw new Error(`Problem set HTTP ${resp.status}`);
  const raw = (await resp.json()) as unknown;
  const parsed = ProblemSetSchema.parse(raw);
  setCache.set(entry.id, parsed);
  return parsed;
}

export async function loadWordSet(
  entry: ContentManifestEntry,
): Promise<WordSet> {
  const cached = wordCache.get(entry.id);
  if (cached) return cached;
  const resp = await fetch(withBase(entry.path));
  if (!resp.ok) throw new Error(`Word set HTTP ${resp.status}`);
  const raw = (await resp.json()) as unknown;
  const parsed = WordSetSchema.parse(raw);
  wordCache.set(entry.id, parsed);
  return parsed;
}
