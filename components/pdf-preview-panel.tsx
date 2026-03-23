'use client';

import { useMemo, useState } from "react";

type PDFPageLocation = {
  page: number;
  startWord: number;
  endWord: number;
  wordCount: number;
};

type PDFPreviewPanelProps = {
  pdfUrl: string;
  pageLocations: PDFPageLocation[];
  currentWordIndex: number;
  onJumpToWord: (wordIndex: number) => void;
};

export function PDFPreviewPanel({
  pdfUrl,
  pageLocations,
  currentWordIndex,
  onJumpToWord,
}: PDFPreviewPanelProps) {
  const [panelWidth, setPanelWidth] = useState(460);

  const frameHeight = useMemo(() => {
    const scaled = Math.round(panelWidth * 0.72);
    return Math.max(280, Math.min(scaled, 520));
  }, [panelWidth]);

  if (pageLocations.length === 0) {
    return null;
  }

  const activePage =
    pageLocations.find(
      (page) => currentWordIndex >= page.startWord && currentWordIndex <= page.endWord,
    ) ?? pageLocations[0];

  return (
    <div
      className="fixed right-4 top-4 z-30 hidden rounded-lg border border-[var(--reader-panel-border)] bg-[var(--reader-panel-bg)] p-3 shadow-xl backdrop-blur lg:block"
      style={{ width: `${panelWidth}px`, maxWidth: "calc(100vw - 2rem)" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--reader-muted)]">
          PDF Preview
        </p>
        <span className="text-xs text-[var(--reader-muted)]">
          Page {activePage.page}/{pageLocations.length}
        </span>
      </div>

      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--reader-muted)]">
          Size
        </span>
        <input
          type="range"
          min={360}
          max={720}
          step={10}
          value={panelWidth}
          onChange={(event) => setPanelWidth(Number(event.target.value))}
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-[var(--reader-progress-track)] accent-[var(--reader-accent)]"
          aria-label="Adjust PDF preview size"
        />
        <span className="w-10 text-right text-[11px] text-[var(--reader-muted)]">
          {panelWidth}px
        </span>
      </div>

      <iframe
        title="PDF preview"
        src={`${pdfUrl}#page=${activePage.page}&zoom=page-width&pagemode=none`}
        className="w-full rounded border border-[var(--reader-control-border)] bg-white"
        style={{ height: `${frameHeight}px` }}
      />

      <p className="mt-2 text-xs text-[var(--reader-muted)]">
        Word {Math.max(1, currentWordIndex + 1)} is on page {activePage.page}
      </p>

      <div className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1">
        {pageLocations.map((page) => {
          const active = page.page === activePage.page;
          return (
            <button
              key={page.page}
              onClick={() => onJumpToWord(page.startWord)}
              className={`flex w-full items-center justify-between rounded border px-2 py-1 text-left text-xs transition ${
                active
                  ? "border-[var(--reader-accent)] bg-[var(--reader-control-hover-bg)] text-[var(--reader-fg)]"
                  : "border-[var(--reader-control-border)] text-[var(--reader-muted)] hover:bg-[var(--reader-control-hover-bg)]"
              }`}
            >
              <span>Page {page.page}</span>
              <span>{page.wordCount} words</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
