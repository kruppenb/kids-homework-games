import { useEffect, useRef, useState } from "react";

interface Props {
  onReady: () => void;
}

const TICK_MS = 500;

export function WindUp({ onReady }: Props) {
  const [count, setCount] = useState(3);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (count > 1) {
        setCount((n) => n - 1);
      } else {
        onReadyRef.current();
      }
    }, TICK_MS);
    return () => window.clearTimeout(id);
  }, [count]);

  return (
    <div className="mt-6 flex h-[320px] flex-col items-center justify-center gap-3">
      <div className="text-sm font-semibold uppercase tracking-widest text-sky-200/80">
        Get ready
      </div>
      <div
        key={count}
        className="text-9xl font-extrabold text-yellow-300 drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
      >
        {count}
      </div>
    </div>
  );
}
