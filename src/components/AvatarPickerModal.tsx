import { availableAvatars, UNLOCKABLE_AVATARS } from "@/lib/avatars";

interface Props {
  current: string;
  unlockedAvatars: string[] | undefined;
  onPick: (avatar: string) => void;
  onClose: () => void;
}

export function AvatarPickerModal({
  current,
  unlockedAvatars,
  onPick,
  onClose,
}: Props) {
  const available = availableAvatars(unlockedAvatars);
  const lockedTiers = UNLOCKABLE_AVATARS.filter(
    (t) => !available.includes(t.emoji),
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">Pick your avatar</h3>

        <div className="mt-4 grid grid-cols-5 gap-2">
          {available.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onPick(a)}
              className={`rounded-lg border-2 p-2 text-3xl transition ${
                current === a
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        {lockedTiers.length > 0 && (
          <>
            <h4 className="mt-5 text-sm font-semibold text-slate-700">
              Keep your streak going to unlock:
            </h4>
            <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
              {lockedTiers.map((t) => (
                <li
                  key={t.emoji}
                  className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-slate-500"
                >
                  <span className="text-2xl opacity-50">🔒</span>
                  <span>{t.label}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl border border-slate-300 py-2 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Close
        </button>
      </div>
    </div>
  );
}
