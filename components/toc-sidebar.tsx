'use client';

import { useMemo, useState } from "react";
import type { TOCItem } from "@/lib/parseTOC";

type TOCSidebarProps = {
  items: TOCItem[];
  currentWordIndex: number;
  wpm: number;
  onJump: (wordIndex: number) => void;
  title?: string;
  layout?: "reader" | "inline";
};

function getIndent(level: 1 | 2 | 3): string {
  if (level === 1) {
    return "pl-2 text-[0.92rem] font-semibold text-[var(--reader-fg)]";
  }

  if (level === 2) {
    return "pl-5 text-[0.84rem] font-medium text-[var(--reader-muted)]";
  }

  return "pl-8 text-[0.8rem] font-normal text-[var(--reader-muted)] opacity-90";
}

export function TOCSidebar({
  items,
  currentWordIndex,
  wpm,
  onJump,
  title = "Document Outline",
  layout = "inline",
}: TOCSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeId = useMemo(() => {
    let active = items[0]?.id;
    for (const item of items) {
      if (item.wordIndex <= currentWordIndex) {
        active = item.id;
      }
    }
    return active;
  }, [currentWordIndex, items]);

  return (
    <>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`z-50 rounded border border-white/20 bg-black/45 px-2 py-1 font-mono text-xs text-white backdrop-blur md:hidden ${
          layout === "reader" ? "fixed left-3 top-3" : "mb-2"
        }`}
        aria-label="Toggle table of contents"
      >
        ☰
      </button>

      <aside
        className={`border-[var(--reader-panel-border)] bg-[var(--reader-panel-bg)] backdrop-blur transition-transform duration-300 ${
          layout === "reader"
            ? "fixed left-0 top-0 z-40 h-screen w-full max-w-[320px] border-r md:sticky md:top-0 md:z-auto md:h-screen md:w-[260px] md:max-w-[260px]"
            : "relative h-[28rem] w-full rounded border"
        } ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} ${
          layout === "inline" && !isOpen ? "hidden md:block" : ""
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[var(--reader-control-border)] px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--reader-muted)]">
              {title}
            </p>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded px-2 py-1 text-xs text-[var(--reader-muted)] hover:bg-[var(--reader-control-hover-bg)] md:hidden"
              aria-label="Close table of contents"
            >
              Close
            </button>
          </div>

          <div className="overflow-y-auto px-2 py-2">
            {items.map((item) => {
              const active = item.id === activeId;
              const minutes = Math.max(1, Math.ceil(item.wordCount / Math.max(wpm, 100)));

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onJump(item.wordIndex);
                    if (typeof window !== "undefined" && window.innerWidth < 768) {
                      setIsOpen(false);
                    }
                  }}
                  className={`group mb-1 flex w-full items-start gap-2 rounded py-2 pr-2 text-left transition ${
                    active
                      ? "bg-[var(--reader-control-hover-bg)]"
                      : "hover:bg-[var(--reader-control-hover-bg)]"
                  } ${getIndent(item.level)}`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full border ${
                      active
                        ? "border-[var(--reader-accent)] bg-[var(--reader-accent)]"
                        : "border-[var(--reader-panel-border)]"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate ${
                        active ? "border-l-2 border-[var(--reader-accent)] pl-2" : "pl-[10px]"
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="mt-1 block pl-[10px] text-[11px] text-[var(--reader-muted)]">
                      ~{minutes} min · {item.wordCount} words
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
