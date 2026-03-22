'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { getOrpIndex, shouldExtendDisplay } from "@/lib/reader-utils";

export type SpeedReaderHandle = {
  togglePlay: () => void;
  restart: () => void;
  skipBy: (amount: number) => void;
};

type SpeedReaderProps = {
  words: string[];
  wpm: number;
  chunkSize: 1 | 2 | 3;
  onIndexChange: (index: number) => void;
  onPlayStateChange: (isPlaying: boolean) => void;
  isDark: boolean;
};

function renderWord(word: string, isDark: boolean) {
  const orp = getOrpIndex(word);

  return (
    <span key={`${word}-${orp}`} className="inline-flex">
      <span>{word.slice(0, orp)}</span>
      <span className={isDark ? "text-red-400" : "text-red-600"}>
        {word.charAt(orp)}
      </span>
      <span>{word.slice(orp + 1)}</span>
    </span>
  );
}

export const SpeedReader = forwardRef<SpeedReaderHandle, SpeedReaderProps>(
  function SpeedReader(
    { words, wpm, chunkSize, onIndexChange, onPlayStateChange, isDark },
    ref,
  ) {
    const [index, setIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    const totalWords = words.length;
    const chunk = useMemo(
      () => words.slice(index, index + chunkSize),
      [words, index, chunkSize],
    );

    const clampIndex = useCallback(
      (nextIndex: number) => {
        if (totalWords === 0) {
          return 0;
        }
        return Math.max(0, Math.min(nextIndex, totalWords - 1));
      },
      [totalWords],
    );

    const skipBy = useCallback(
      (amount: number) => {
        setIndex((prev) => clampIndex(prev + amount));
      },
      [clampIndex],
    );

    const restart = useCallback(() => {
      setIndex(0);
      setIsPlaying(false);
    }, []);

    const togglePlay = useCallback(() => {
      setIsPlaying((prev) => {
        if (totalWords === 0) {
          return false;
        }

        return !prev;
      });
    }, [totalWords]);

    useImperativeHandle(ref, () => ({ togglePlay, restart, skipBy }), [
      restart,
      skipBy,
      togglePlay,
    ]);

    useEffect(() => {
      onIndexChange(index);
    }, [index, onIndexChange]);

    useEffect(() => {
      onPlayStateChange(isPlaying);
    }, [isPlaying, onPlayStateChange]);

    useEffect(() => {
      if (!isPlaying || totalWords === 0) {
        return;
      }

      const baseDelay = 60000 / wpm;
      const multiplier = shouldExtendDisplay(chunk) ? 1.8 : 1;

      timeoutRef.current = window.setTimeout(() => {
        setIndex((prev) => {
          const next = prev + chunkSize;
          if (next >= totalWords) {
            setIsPlaying(false);
            return prev;
          }

          return next;
        });
      }, baseDelay * multiplier);

      return () => {
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
        }
      };
    }, [isPlaying, totalWords, index, chunk, chunkSize, wpm]);

    useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.code === "Space") {
          event.preventDefault();
          togglePlay();
        }

        if (event.code === "ArrowLeft") {
          event.preventDefault();
          skipBy(-5);
        }

        if (event.code === "ArrowRight") {
          event.preventDefault();
          skipBy(5);
        }
      };

      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }, [skipBy, togglePlay]);

    return (
      <div className="flex min-h-[45vh] items-center justify-center px-6 text-center font-mono">
        <div
          key={`${index}-${chunkSize}`}
          className="word-fade text-5xl font-semibold tracking-[0.04em] sm:text-7xl"
        >
          {chunk.length > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
              {chunk.map((word, chunkIndex) => (
                <span key={`${index + chunkIndex}-${word}`}>
                  {renderWord(word, isDark)}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-neutral-500">No words loaded.</span>
          )}
        </div>
      </div>
    );
  },
);
