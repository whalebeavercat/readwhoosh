'use client';

import { useMemo } from "react";
import { parseTOC, type TOCItem } from "@/lib/parseTOC";
import { tokenizeText } from "@/lib/reader-utils";

type TOCSource = "pdf" | "text" | "image";

export function useTOC(text: string, rawText: string, source: TOCSource) {
  return useMemo(() => {
    const words = tokenizeText(text);
    const items = parseTOC(words, rawText || text, source);
    return {
      items,
      hasTOC: items.length >= 3,
      emptyMessage:
        items.length >= 3
          ? ""
          : "No chapters detected — reading from the beginning",
    } satisfies {
      items: TOCItem[];
      hasTOC: boolean;
      emptyMessage: string;
    };
  }, [text, rawText, source]);
}
