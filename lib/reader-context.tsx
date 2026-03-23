'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_READER_ACCENT,
  DEFAULT_READER_THEME,
  READER_ACCENT_OPTIONS,
  READER_THEME_OPTIONS,
  type ReaderAccentId,
  type ReaderThemeId,
} from "@/lib/reader-appearance";

type ReaderContextValue = {
  text: string;
  source: "text" | "image" | "pdf";
  tocRawText: string;
  startWordIndex: number;
  pdfPreviewUrl: string | null;
  pdfPageLocations: {
    page: number;
    startWord: number;
    endWord: number;
    wordCount: number;
  }[];
  readerTheme: ReaderThemeId;
  readerAccent: ReaderAccentId;
  setText: (value: string) => void;
  setSource: (value: "text" | "image" | "pdf") => void;
  setTocRawText: (value: string) => void;
  setStartWordIndex: (value: number) => void;
  setPdfPreviewUrl: (value: string | null) => void;
  setPdfPageLocations: (
    value: {
      page: number;
      startWord: number;
      endWord: number;
      wordCount: number;
    }[],
  ) => void;
  setReaderTheme: (value: ReaderThemeId) => void;
  setReaderAccent: (value: ReaderAccentId) => void;
};

const ReaderContext = createContext<ReaderContextValue | null>(null);
const STORAGE_KEY = "rsvp-reader-text";
const SOURCE_STORAGE_KEY = "whoosh-source";
const TOC_RAW_STORAGE_KEY = "whoosh-toc-raw-text";
const START_INDEX_STORAGE_KEY = "whoosh-start-word-index";
const PDF_PAGE_LOCATIONS_STORAGE_KEY = "whoosh-pdf-page-locations";
const MAX_PERSISTED_TEXT_CHARS = 450_000;

function readSessionValue(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionValue(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage quota / browser privacy errors and keep in-memory state.
  }
}
const READER_THEME_STORAGE_KEY = "whoosh-reader-theme";
const READER_ACCENT_STORAGE_KEY = "whoosh-reader-accent";

export function ReaderProvider({ children }: { children: ReactNode }) {
  const [text, setTextState] = useState(() => {
    return readSessionValue(STORAGE_KEY) ?? "";
  });
  const [source, setSourceState] = useState<"text" | "image" | "pdf">(() => {
    const stored = readSessionValue(SOURCE_STORAGE_KEY);
    return stored === "image" || stored === "pdf" ? stored : "text";
  });
  const [tocRawText, setTocRawTextState] = useState(() => {
    return readSessionValue(TOC_RAW_STORAGE_KEY) ?? "";
  });
  const [startWordIndex, setStartWordIndexState] = useState(() => {
    const stored = Number(readSessionValue(START_INDEX_STORAGE_KEY));
    return Number.isFinite(stored) && stored >= 0 ? Math.floor(stored) : 0;
  });
  const [pdfPreviewUrl, setPdfPreviewUrlState] = useState<string | null>(null);
  const [pdfPageLocations, setPdfPageLocationsState] = useState<
    {
      page: number;
      startWord: number;
      endWord: number;
      wordCount: number;
    }[]
  >(() => {
    try {
      const raw = readSessionValue(PDF_PAGE_LOCATIONS_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as ReaderContextValue["pdfPageLocations"]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [readerTheme, setReaderThemeState] = useState<ReaderThemeId>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_READER_THEME;
    }

    const stored = window.sessionStorage.getItem(READER_THEME_STORAGE_KEY);
    const isValid = READER_THEME_OPTIONS.some((theme) => theme.id === stored);
    return isValid ? (stored as ReaderThemeId) : DEFAULT_READER_THEME;
  });
  const [readerAccent, setReaderAccentState] = useState<ReaderAccentId>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_READER_ACCENT;
    }

    const stored = window.sessionStorage.getItem(READER_ACCENT_STORAGE_KEY);
    const isValid = READER_ACCENT_OPTIONS.some((accent) => accent.id === stored);
    return isValid ? (stored as ReaderAccentId) : DEFAULT_READER_ACCENT;
  });

  const setText = (value: string) => {
    setTextState(value);
    writeSessionValue(STORAGE_KEY, value.slice(0, MAX_PERSISTED_TEXT_CHARS));
  };

  const setSource = (value: "text" | "image" | "pdf") => {
    setSourceState(value);
    writeSessionValue(SOURCE_STORAGE_KEY, value);
  };

  const setTocRawText = (value: string) => {
    setTocRawTextState(value);
    writeSessionValue(TOC_RAW_STORAGE_KEY, value.slice(0, MAX_PERSISTED_TEXT_CHARS));
  };

  const setStartWordIndex = (value: number) => {
    const next = Math.max(0, Math.floor(value));
    setStartWordIndexState(next);
    writeSessionValue(START_INDEX_STORAGE_KEY, String(next));
  };

  const setPdfPreviewUrl = (value: string | null) => {
    setPdfPreviewUrlState(value);
  };

  const setPdfPageLocations = (value: ReaderContextValue["pdfPageLocations"]) => {
    setPdfPageLocationsState(value);
    writeSessionValue(PDF_PAGE_LOCATIONS_STORAGE_KEY, JSON.stringify(value));
  };

  const setReaderTheme = (value: ReaderThemeId) => {
    setReaderThemeState(value);
    writeSessionValue(READER_THEME_STORAGE_KEY, value);
  };

  const setReaderAccent = (value: ReaderAccentId) => {
    setReaderAccentState(value);
    writeSessionValue(READER_ACCENT_STORAGE_KEY, value);
  };

  const value = useMemo(
    () => ({
      text,
      source,
      tocRawText,
      startWordIndex,
      pdfPreviewUrl,
      pdfPageLocations,
      readerTheme,
      readerAccent,
      setText,
      setSource,
      setTocRawText,
      setStartWordIndex,
      setPdfPreviewUrl,
      setPdfPageLocations,
      setReaderTheme,
      setReaderAccent,
    }),
    [
      text,
      source,
      tocRawText,
      startWordIndex,
      pdfPreviewUrl,
      pdfPageLocations,
      readerTheme,
      readerAccent,
    ],
  );

  return (
    <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>
  );
}

export function useReaderText() {
  const context = useContext(ReaderContext);
  if (!context) {
    throw new Error("useReaderText must be used inside ReaderProvider");
  }
  return context;
}
