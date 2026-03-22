'use client';

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ControlBar } from "@/components/control-bar";
import { ProgressBar } from "@/components/progress-bar";
import { SpeedReader, type SpeedReaderHandle } from "@/components/speed-reader";
import { WPMSlider } from "@/components/wpm-slider";
import { useReaderText } from "@/lib/reader-context";
import { tokenizeText } from "@/lib/reader-utils";

export default function ReaderPage() {
  const { text } = useReaderText();
  const words = useMemo(() => tokenizeText(text), [text]);
  const readerRef = useRef<SpeedReaderHandle>(null);

  const [wpm, setWpm] = useState(380);
  const [chunkSize, setChunkSize] = useState<1 | 2 | 3>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [showChrome, setShowChrome] = useState(true);
  const [isDark, setIsDark] = useState(true);

  const revealChrome = useCallback(() => {
    setShowChrome(true);
  }, []);

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
      className={`relative min-h-screen overflow-hidden transition-colors ${
        isDark ? "bg-neutral-950 text-neutral-100" : "bg-neutral-50 text-neutral-900"
      }`}
    >
      <ProgressBar current={index + chunkSize} total={words.length} />

      <SpeedReader
        ref={readerRef}
        words={words}
        wpm={wpm}
        chunkSize={chunkSize}
        onIndexChange={setIndex}
        onPlayStateChange={setIsPlaying}
        isDark={isDark}
      />

      <div
        className={`absolute inset-x-0 bottom-0 p-4 transition-opacity duration-300 sm:p-6 ${
          showChrome ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className={`mx-auto flex w-full max-w-4xl flex-col gap-4 rounded border p-4 backdrop-blur ${
            isDark
              ? "border-white/15 bg-black/45"
              : "border-black/15 bg-white/65"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.2em]">
            <span className={isDark ? "text-neutral-300" : "text-neutral-700"}>
              Word {Math.min(index + 1, words.length)} / {words.length}
            </span>
            <Link
              href="/"
              className={isDark ? "text-neutral-400 hover:text-white" : "text-neutral-600 hover:text-black"}
            >
              Upload
            </Link>
          </div>

          <WPMSlider value={wpm} onChange={setWpm} />

          <ControlBar
            isPlaying={isPlaying}
            chunkSize={chunkSize}
            isDark={isDark}
            onPlayPause={() => readerRef.current?.togglePlay()}
            onRestart={() => readerRef.current?.restart()}
            onBack={() => readerRef.current?.skipBy(-5)}
            onForward={() => readerRef.current?.skipBy(5)}
            onChunkChange={setChunkSize}
            onThemeToggle={() => setIsDark((prev) => !prev)}
          />

          <p className={isDark ? "text-xs text-neutral-500" : "text-xs text-neutral-600"}>
            Keyboard: Space to play/pause, Left/Right to jump 5 words.
          </p>
        </div>
      </div>
    </main>
  );
}
