const KEY_MUTED = "khg:muted";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

export function isMuted(): boolean {
  try {
    return localStorage.getItem(KEY_MUTED) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    if (muted) localStorage.setItem(KEY_MUTED, "1");
    else localStorage.removeItem(KEY_MUTED);
  } catch {
    // ignore
  }
}

function tone(freq: number, durationMs: number, type: OscillatorType = "sine") {
  if (isMuted()) return;
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(c.destination);
  const now = c.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  osc.start(now);
  osc.stop(now + durationMs / 1000);
}

export function playCorrect() {
  // two-note rising chime
  tone(660, 90);
  setTimeout(() => tone(990, 130), 80);
}

export function playWrong() {
  tone(180, 220, "sawtooth");
}

export function playLevelUp() {
  tone(523, 90);
  setTimeout(() => tone(659, 90), 80);
  setTimeout(() => tone(784, 200), 160);
}
