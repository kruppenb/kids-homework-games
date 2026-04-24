import { useState } from "react";
import type { Grade, KidProfile } from "@/types/profile";

const AVATARS = ["🦊", "🐼", "🦁", "🐸", "🦄", "🐙", "🦖", "🐳", "🦉", "🐯"];
const GRADES: Grade[] = ["1", "2", "3", "4", "5"];

interface Props {
  profiles: KidProfile[];
  onSelect: (id: string) => void;
  onCreate: (input: { name: string; grade: Grade; avatar: string }) => void;
}

export function ProfilePicker({ profiles, onSelect, onCreate }: Props) {
  const [adding, setAdding] = useState(profiles.length === 0);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<Grade>("1");
  const [avatar, setAvatar] = useState(AVATARS[0]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate({ name: trimmed, grade, avatar });
    setName("");
    setAvatar(AVATARS[0]);
    setGrade("1");
    setAdding(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100 p-6">
      <div className="mx-auto max-w-2xl pt-8">
        <h1 className="text-center text-4xl font-extrabold text-slate-900">
          Who's playing?
        </h1>
        <p className="mt-2 text-center text-slate-600">
          Pick your kid — each one gets their own games and progress.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className="flex flex-col items-center rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="text-5xl" aria-hidden>
                {p.avatar}
              </span>
              <span className="mt-3 text-lg font-semibold text-slate-900">
                {p.name}
              </span>
              <span className="text-sm text-slate-500">Grade {p.grade}</span>
            </button>
          ))}

          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-6 text-slate-500 transition hover:border-indigo-400 hover:text-indigo-600"
            >
              <span className="text-4xl leading-none">+</span>
              <span className="mt-2 font-semibold">Add a kid</span>
            </button>
          )}
        </div>

        {adding && (
          <form
            onSubmit={handleCreate}
            className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
          >
            <h2 className="text-xl font-bold text-slate-900">New kid</h2>

            <label className="mt-4 block">
              <span className="text-sm font-semibold text-slate-700">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-lg focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="First name"
                maxLength={20}
              />
            </label>

            <fieldset className="mt-4">
              <legend className="text-sm font-semibold text-slate-700">
                Grade
              </legend>
              <div className="mt-2 flex gap-2">
                {GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrade(g)}
                    className={`flex-1 rounded-lg border px-4 py-2 font-semibold transition ${
                      grade === g
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-4">
              <legend className="text-sm font-semibold text-slate-700">
                Avatar
              </legend>
              <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-10">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    aria-label={`Pick ${a}`}
                    className={`rounded-lg border p-2 text-2xl transition ${
                      avatar === a
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Create
              </button>
              {profiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="rounded-lg border border-slate-300 px-4 py-3 text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
