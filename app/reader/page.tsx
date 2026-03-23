'use client';

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { ControlBar } from "@/components/control-bar";
import { PDFPreviewPanel } from "@/components/pdf-preview-panel";
import { ProgressBar } from "@/components/progress-bar";
import { RecallCheckModal, SpacedReviewQueue } from "@/components/recall-review-panel";
import { SpeedReader, type SpeedReaderHandle } from "@/components/speed-reader";
import { TOCSidebar } from "@/components/toc-sidebar";
import { WPMSlider } from "@/components/wpm-slider";
import { useReaderText } from "@/lib/reader-context";
import { tokenizeText } from "@/lib/reader-utils";
import {
  buildCardsFromTOC,
  getDocId,
  getDueCards,
  loadAllCards,
  mergeDocCards,
  rateCard,
  saveAllCards,
  type ReviewCard,
  type ReviewRating,
} from "@/lib/spaced-review";
import { useTOC } from "@/lib/useTOC";

const THEME_OPTIONS = [
  {
    id: "midnight",
    label: "Midnight",
    vars: {
      "--reader-bg": "#05070f",
      "--reader-fg": "#f5f7ff",
      "--reader-muted": "#9ca5bf",
      "--reader-panel-bg": "rgba(6, 11, 24, 0.78)",
      "--reader-panel-border": "rgba(173, 188, 255, 0.22)",
      "--reader-link": "#a8b5da",
      "--reader-link-hover": "#ffffff",
      "--reader-control-border": "rgba(173, 188, 255, 0.28)",
      "--reader-control-hover-bg": "rgba(163, 177, 234, 0.16)",
      "--reader-control-text": "#e8ecff",
      "--reader-progress-track": "rgba(173, 188, 255, 0.2)",
    },
  },
  {
    id: "paper",
    label: "Paper",
    vars: {
      "--reader-bg": "#f8f3e8",
      "--reader-fg": "#1c1914",
      "--reader-muted": "#645f54",
      "--reader-panel-bg": "rgba(255, 251, 241, 0.86)",
      "--reader-panel-border": "rgba(66, 57, 40, 0.18)",
      "--reader-link": "#725a2f",
      "--reader-link-hover": "#3f2f1a",
      "--reader-control-border": "rgba(66, 57, 40, 0.28)",
      "--reader-control-hover-bg": "rgba(66, 57, 40, 0.1)",
      "--reader-control-text": "#2a251d",
      "--reader-progress-track": "rgba(66, 57, 40, 0.15)",
    },
  },
  {
    id: "ocean",
    label: "Ocean",
    vars: {
      "--reader-bg": "#031722",
      "--reader-fg": "#dff8ff",
      "--reader-muted": "#84b6c8",
      "--reader-panel-bg": "rgba(4, 30, 42, 0.8)",
      "--reader-panel-border": "rgba(120, 220, 236, 0.26)",
      "--reader-link": "#83e4ff",
      "--reader-link-hover": "#ddf9ff",
      "--reader-control-border": "rgba(120, 220, 236, 0.32)",
      "--reader-control-hover-bg": "rgba(125, 220, 236, 0.15)",
      "--reader-control-text": "#d8f7ff",
      "--reader-progress-track": "rgba(120, 220, 236, 0.2)",
    },
  },
] as const;

const ACCENT_OPTIONS = [
  {
    id: "ember",
    label: "Ember",
    vars: {
      "--reader-accent": "#f97316",
      "--reader-accent-strong": "#ea580c",
    },
  },
  {
    id: "cyan",
    label: "Cyan",
    vars: {
      "--reader-accent": "#06b6d4",
      "--reader-accent-strong": "#0891b2",
    },
  },
  {
    id: "lime",
    label: "Lime",
    vars: {
      "--reader-accent": "#84cc16",
      "--reader-accent-strong": "#65a30d",
    },
  },
  {
    id: "rose",
    label: "Rose",
    vars: {
      "--reader-accent": "#f43f5e",
      "--reader-accent-strong": "#e11d48",
    },
  },
] as const;

type ReaderStyleVars = CSSProperties & Record<`--${string}`, string>;

export default function ReaderPage() {
  const {
    text,
    source,
    tocRawText,
    startWordIndex,
    pdfPreviewUrl,
    pdfPageLocations,
    setStartWordIndex,
  } = useReaderText();
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const safeText = isHydrated ? text : "";
  const safeSource = isHydrated ? source : "text";
  const safeRaw = isHydrated ? tocRawText : "";
  const safeStartIndex = isHydrated ? startWordIndex : 0;
  const safePdfPreviewUrl = isHydrated ? pdfPreviewUrl : null;
  const safePdfPageLocations = isHydrated ? pdfPageLocations : [];

  const words = useMemo(() => tokenizeText(safeText), [safeText]);
  const { items: tocItems, hasTOC } = useTOC(safeText, safeRaw, safeSource);
  const canReview = tocItems.length >= 1;
  const canRecall = tocItems.length >= 2;
  const readerRef = useRef<SpeedReaderHandle>(null);

  const [wpm, setWpm] = useState(380);
  const [chunkSize, setChunkSize] = useState<1 | 2 | 3>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [showChrome, setShowChrome] = useState(true);
  const [jumpFlash, setJumpFlash] = useState(false);
  const [reviewCards, setReviewCards] = useState<ReviewCard[]>(() => loadAllCards());
  const [recallTargetCardId, setRecallTargetCardId] = useState<string | null>(null);
  const [recallEnabled, setRecallEnabled] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<(typeof THEME_OPTIONS)[number]["id"]>("midnight");
  const [selectedAccent, setSelectedAccent] = useState<(typeof ACCENT_OPTIONS)[number]["id"]>("ember");
  const promptedSectionsRef = useRef<Set<string>>(new Set());
  const previousSectionIndexRef = useRef(-1);

  const activeTheme =
    THEME_OPTIONS.find((theme) => theme.id === selectedTheme) ?? THEME_OPTIONS[0];
  const activeAccent =
    ACCENT_OPTIONS.find((accent) => accent.id === selectedAccent) ?? ACCENT_OPTIONS[0];

  const readerStyle = useMemo<ReaderStyleVars>(
    () => ({
      ...activeTheme.vars,
      ...activeAccent.vars,
    }),
    [activeTheme.vars, activeAccent.vars],
  );

  const revealChrome = useCallback(() => {
    setShowChrome(true);
  }, []);

  const docId = useMemo(() => getDocId(safeText), [safeText]);
  const generatedCards = useMemo(
    () => (canReview ? buildCardsFromTOC(docId, tocItems) : []),
    [canReview, docId, tocItems],
  );
  const mergedReviewCards = useMemo(
    () => mergeDocCards(reviewCards, generatedCards),
    [reviewCards, generatedCards],
  );
  const dueCards = useMemo(() => getDueCards(mergedReviewCards, docId), [mergedReviewCards, docId]);

  useEffect(() => {
    let timeoutId: number | undefined;
    const onActivity = () => {
      setShowChrome(true);

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        setShowChrome(false);
      }, 3000);
    };

    onActivity();

    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("touchstart", onActivity);

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("touchstart", onActivity);
    };
  }, []);

  useEffect(() => {
    if (safeStartIndex > 0) {
      readerRef.current?.jumpTo(safeStartIndex, true);
    }
  }, [safeStartIndex]);

  useEffect(() => {
    saveAllCards(mergedReviewCards);
  }, [mergedReviewCards]);

  useEffect(() => {
    promptedSectionsRef.current.clear();
    previousSectionIndexRef.current = -1;
  }, [docId]);

  const handleTOCJump = useCallback(
    (wordIndex: number) => {
      setStartWordIndex(wordIndex);
      setJumpFlash(true);
      window.setTimeout(() => {
        setJumpFlash(false);
      }, 420);
    },
    [setStartWordIndex],
  );

  const handleWordJump = useCallback(
    (wordIndex: number) => {
      setStartWordIndex(wordIndex);
      readerRef.current?.jumpTo(wordIndex, true);
      setJumpFlash(true);
      window.setTimeout(() => {
        setJumpFlash(false);
      }, 420);
    },
    [setStartWordIndex],
  );

  const handleReviewRating = useCallback((cardId: string, rating: ReviewRating) => {
    setReviewCards((prev) => rateCard(mergeDocCards(prev, generatedCards), cardId, rating));
  }, [generatedCards]);

  const handleRecallRating = useCallback(
    (rating: ReviewRating) => {
      if (!recallTargetCardId) {
        return;
      }
      setReviewCards((prev) => rateCard(mergeDocCards(prev, generatedCards), recallTargetCardId, rating));
      setRecallTargetCardId(null);
    },
    [generatedCards, recallTargetCardId],
  );

  const recallCard = useMemo(
    () => mergedReviewCards.find((card) => card.id === recallTargetCardId) ?? null,
    [mergedReviewCards, recallTargetCardId],
  );

  const handleReaderIndexChange = useCallback(
    (nextIndex: number) => {
      setIndex(nextIndex);

      if (!canRecall || !recallEnabled) {
        return;
      }

      let activeSection = 0;
      for (let i = 0; i < tocItems.length; i += 1) {
        if (tocItems[i].wordIndex <= nextIndex) {
          activeSection = i;
        }
      }

      const prevSection = previousSectionIndexRef.current;
      if (activeSection <= prevSection || activeSection <= 0) {
        previousSectionIndexRef.current = activeSection;
        return;
      }

      const completed = tocItems[activeSection - 1];
      previousSectionIndexRef.current = activeSection;

      if (!completed || promptedSectionsRef.current.has(completed.id)) {
        return;
      }

      promptedSectionsRef.current.add(completed.id);
      const matched = mergedReviewCards.find(
        (card) => card.docId === docId && card.wordIndex === completed.wordIndex,
      );

      if (!matched) {
        return;
      }

      setRecallTargetCardId(matched.id);
      readerRef.current?.pause();
    },
    [canRecall, docId, mergedReviewCards, recallEnabled, tocItems],
  );

  if (words.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-xl rounded border border-white/15 bg-black/50 p-8 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">
            No content found
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Load text before reading.</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Go back to the upload page and add plain text, image OCR, or a PDF.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded border border-red-400/60 bg-red-500/80 px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-white"
          >
            Back to Upload
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      onMouseMove={revealChrome}
      style={readerStyle}
      className="relative min-h-screen overflow-hidden bg-[var(--reader-bg)] text-[var(--reader-fg)] transition-colors"
    >
      <div className="relative flex min-h-screen">
        {hasTOC && (
          <div className="shrink-0">
            <TOCSidebar
              items={tocItems}
              currentWordIndex={index}
              wpm={wpm}
              onJump={handleTOCJump}
              title="Table of Contents"
              layout="reader"
            />
          </div>
        )}

        <section className="relative min-w-0 flex-1">
          {safeSource === "pdf" && safePdfPreviewUrl && safePdfPageLocations.length > 0 && (
            <PDFPreviewPanel
              pdfUrl={safePdfPreviewUrl}
              pageLocations={safePdfPageLocations}
              currentWordIndex={index}
              onJumpToWord={handleWordJump}
            />
          )}

          <ProgressBar current={index + chunkSize} total={words.length} />

          <div className={`transition-shadow duration-500 ${jumpFlash ? "shadow-[inset_0_0_0_2px_var(--reader-accent)]" : ""}`}>
            <SpeedReader
              ref={readerRef}
              words={words}
              wpm={wpm}
              chunkSize={chunkSize}
              onIndexChange={handleReaderIndexChange}
              onPlayStateChange={setIsPlaying}
            />
          </div>

          <div
            className={`absolute inset-x-0 bottom-0 p-4 transition-opacity duration-300 sm:p-6 ${
              showChrome ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <div
              className="mx-auto flex w-full max-w-4xl flex-col gap-4 rounded border border-[var(--reader-panel-border)] bg-[var(--reader-panel-bg)] p-4 backdrop-blur"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.2em]">
                <span className="text-[var(--reader-muted)]">
                  Word {Math.min(index + 1, words.length)} / {words.length}
                </span>
                <Link
                  href="/"
                  className="text-[var(--reader-link)] transition-colors hover:text-[var(--reader-link-hover)]"
                >
                  Upload
                </Link>
              </div>

              <WPMSlider value={wpm} onChange={setWpm} />

              <ControlBar
                isPlaying={isPlaying}
                chunkSize={chunkSize}
                selectedTheme={selectedTheme}
                selectedAccent={selectedAccent}
                recallEnabled={recallEnabled}
                themeOptions={THEME_OPTIONS.map(({ id, label }) => ({ id, label }))}
                accentOptions={ACCENT_OPTIONS.map(({ id, label }) => ({ id, label }))}
                onPlayPause={() => readerRef.current?.togglePlay()}
                onRestart={() => readerRef.current?.restart()}
                onBack={() => readerRef.current?.skipBy(-5)}
                onForward={() => readerRef.current?.skipBy(5)}
                onChunkChange={setChunkSize}
                onThemeChange={(themeId) => setSelectedTheme(themeId as (typeof THEME_OPTIONS)[number]["id"])}
                onAccentChange={(accentId) => setSelectedAccent(accentId as (typeof ACCENT_OPTIONS)[number]["id"])}
                onRecallToggle={() => {
                  setRecallEnabled((prev) => {
                    const next = !prev;
                    if (!next) {
                      setRecallTargetCardId(null);
                    }
                    return next;
                  });
                }}
              />

              <SpacedReviewQueue dueCards={dueCards} onRate={handleReviewRating} />

              <p className="text-xs text-[var(--reader-muted)]">
                Keyboard: Space to play/pause, Left/Right to jump 5 words.
              </p>
            </div>
          </div>
        </section>
      </div>

      <RecallCheckModal
        isOpen={Boolean(recallCard)}
        sectionLabel={recallCard?.label ?? "Section"}
        onClose={() => setRecallTargetCardId(null)}
        onRate={handleRecallRating}
      />
    </main>
  );
}
