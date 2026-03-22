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
  setText: (value: string) => void;
};

const ReaderContext = createContext<ReaderContextValue | null>(null);
const STORAGE_KEY = "rsvp-reader-text";

export function ReaderProvider({ children }: { children: ReactNode }) {
  const [text, setTextState] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return window.sessionStorage.getItem(STORAGE_KEY) ?? "";
  });

  const setText = (value: string) => {
    setTextState(value);
    window.sessionStorage.setItem(STORAGE_KEY, value);
  };

  const value = useMemo(() => ({ text, setText }), [text]);

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
