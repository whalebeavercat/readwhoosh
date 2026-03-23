'use client';

import { useEffect, useMemo, useRef } from "react";

type WordContextPanelProps = {
  words: string[];
  currentWordIndex: number;
  onJump: (wordIndex: number) => void;
  topClassName?: string;
};

export function WordContextPanel({
  words,
  currentWordIndex,
  onJump,
  topClassName = "top-4",
}: WordContextPanelProps) {
  const listRef = useRef<HTMLDivElement | null>(null);

  const windowed = useMemo(() => {
    const start = Math.max(0, currentWordIndex - 40);
    const end = Math.min(words.length, currentWordIndex + 120);
    return words.slice(start, end).map((word, offset) => ({
      index: start + offset,
      word,
    }));
  }, [currentWordIndex, words]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    const active = list.querySelector<HTMLElement>("[data-current='true']");
    if (active) {
      active.scrollIntoView({ block: "center" });
    }
  }, [currentWordIndex, windowed]);

  if (words.length === 0) {
    return null;
  }

  return (
    <aside
      className={`fixed right-4 z-30 hidden w-[300px] max-w-[34vw] rounded border border-[var(--reader-panel-border)] bg-[var(--reader-panel-bg)] p-3 shadow-xl backdrop-blur lg:block ${topClassName}`}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--reader-muted)]">
        Word Context
      </p>
      <div
        ref={listRef}
        className="mt-2 max-h-[52vh] overflow-y-auto rounded border border-[var(--reader-control-border)] p-2 text-sm leading-7 text-[var(--reader-muted)]"
      >
        {windowed.map((item) => {
          const active = item.index === currentWordIndex;
          return (
            <button
              key={`${item.index}-${item.word}`}
              onClick={() => onJump(item.index)}
              data-current={active ? "true" : "false"}
              className={`inline rounded px-0.5 py-0.5 text-left transition ${
                active
                  ? "bg-[var(--reader-control-hover-bg)] text-[var(--reader-fg)] ring-1 ring-[var(--reader-accent)]"
                  : "text-[var(--reader-muted)] hover:bg-[var(--reader-control-hover-bg)] hover:text-[var(--reader-fg)]"
              }`}
            >
              {item.word}{" "}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
