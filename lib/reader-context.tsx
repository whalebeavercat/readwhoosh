'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
};

const ReaderContext = createContext<ReaderContextValue | null>(null);
const STORAGE_KEY = "rsvp-reader-text";
const SOURCE_STORAGE_KEY = "whoosh-source";
const TOC_RAW_STORAGE_KEY = "whoosh-toc-raw-text";
const START_INDEX_STORAGE_KEY = "whoosh-start-word-index";
const PDF_PAGE_LOCATIONS_STORAGE_KEY = "whoosh-pdf-page-locations";

export function ReaderProvider({ children }: { children: ReactNode }) {
  const [text, setTextState] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return window.sessionStorage.getItem(STORAGE_KEY) ?? "";
  });
  const [source, setSourceState] = useState<"text" | "image" | "pdf">(() => {
    if (typeof window === "undefined") {
      return "text";
    }

    const stored = window.sessionStorage.getItem(SOURCE_STORAGE_KEY);
    return stored === "image" || stored === "pdf" ? stored : "text";
  });
  const [tocRawText, setTocRawTextState] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return window.sessionStorage.getItem(TOC_RAW_STORAGE_KEY) ?? "";
  });
  const [startWordIndex, setStartWordIndexState] = useState(() => {
    if (typeof window === "undefined") {
      return 0;
    }

    const stored = Number(window.sessionStorage.getItem(START_INDEX_STORAGE_KEY));
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
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const raw = window.sessionStorage.getItem(PDF_PAGE_LOCATIONS_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as ReaderContextValue["pdfPageLocations"]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const setText = (value: string) => {
    setTextState(value);
    window.sessionStorage.setItem(STORAGE_KEY, value);
  };

  const setSource = (value: "text" | "image" | "pdf") => {
    setSourceState(value);
    window.sessionStorage.setItem(SOURCE_STORAGE_KEY, value);
  };

  const setTocRawText = (value: string) => {
    setTocRawTextState(value);
    window.sessionStorage.setItem(TOC_RAW_STORAGE_KEY, value);
  };

  const setStartWordIndex = (value: number) => {
    const next = Math.max(0, Math.floor(value));
    setStartWordIndexState(next);
    window.sessionStorage.setItem(START_INDEX_STORAGE_KEY, String(next));
  };

  const setPdfPreviewUrl = (value: string | null) => {
    setPdfPreviewUrlState(value);
  };

  const setPdfPageLocations = (value: ReaderContextValue["pdfPageLocations"]) => {
    setPdfPageLocationsState(value);
    window.sessionStorage.setItem(PDF_PAGE_LOCATIONS_STORAGE_KEY, JSON.stringify(value));
  };

  const value = useMemo(
    () => ({
      text,
      source,
      tocRawText,
      startWordIndex,
      pdfPreviewUrl,
      pdfPageLocations,
      setText,
      setSource,
      setTocRawText,
      setStartWordIndex,
      setPdfPreviewUrl,
      setPdfPageLocations,
    }),
    [text, source, tocRawText, startWordIndex, pdfPreviewUrl, pdfPageLocations],
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
