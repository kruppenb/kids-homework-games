import type { AvatarTier } from "@/lib/avatars";

interface Props {
  unlocks: AvatarTier[];
  onDismiss: () => void;
}

export function UnlockBanner({ unlocks, onDismiss }: Props) {
  if (unlocks.length === 0) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-gradient-to-r from-amber-300 to-orange-400 p-5 shadow-lg ring-2 ring-amber-200">
        <h3 className="text-lg font-extrabold text-amber-950">
          🎉 New avatar unlocked!
        </h3>
        <ul className="mt-2 space-y-1 text-amber-950">
          {unlocks.map((u) => (
            <li key={u.emoji} className="flex items-center gap-2">
              <span className="text-3xl">{u.emoji}</span>
              <span className="font-semibold">{u.label}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-4 w-full rounded-xl bg-white/30 py-2 font-semibold text-amber-950 hover:bg-white/50"
        >
          Sweet!
        </button>
      </div>
    </div>
  );
}
