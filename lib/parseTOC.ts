import { tokenizeText } from "@/lib/reader-utils";

export type TOCItem = {
  id: string;
  label: string;
  level: 1 | 2 | 3;
  wordIndex: number;
  wordCount: number;
  estimatedMinutes: number;
};

type TOCSource = "pdf" | "text" | "image";

export type PDFTOCBlock = {
  text: string;
  wordIndex: number;
  fontSize: number;
  bold: boolean;
};

type HeadingSeed = {
  label: string;
  level: 1 | 2 | 3;
  wordIndex: number;
};

const DEFAULT_WPM = 380;
const MAX_HEADING_LEN = 48;
const PDF_BLOCKS_PREFIX = "__WHOOSH_PDF_BLOCKS__:";
const MAX_TOC_ITEMS = 18;
const MIN_GAP_WORDS = 36;

function isNoisyHeading(value: string): boolean {
  const normalized = normalizeLabel(value);
  const words = tokenizeText(normalized);
  if (normalized.length < 4 || normalized.length > 96) {
    return true;
  }
  if (words.length === 0 || words.length > 12) {
    return true;
  }
  if (/^\d+$/.test(normalized.replace(/[\s.-]/g, ""))) {
    return true;
  }
  if (/^(page|chapter)\s+\d+$/i.test(normalized)) {
    return true;
  }
  return false;
}

function pickImportantItems(items: TOCItem[], totalWords: number): TOCItem[] {
  const minSectionWords = Math.max(50, Math.floor(totalWords / 120));

  const filteredBySize = items.filter(
    (item) => item.level === 1 || item.wordCount >= minSectionWords,
  );

  const spaced: TOCItem[] = [];
  for (const item of filteredBySize) {
    const prev = spaced.at(-1);
    if (!prev) {
      spaced.push(item);
      continue;
    }

    const close = item.wordIndex - prev.wordIndex < MIN_GAP_WORDS;
    if (close && item.level >= prev.level) {
      continue;
    }
    if (close && item.level < prev.level) {
      spaced[spaced.length - 1] = item;
      continue;
    }
    spaced.push(item);
  }

  if (spaced.length <= MAX_TOC_ITEMS) {
    return spaced;
  }

  const keep = new Map<number, TOCItem>();
  for (const item of spaced) {
    if (item.level === 1) {
      keep.set(item.wordIndex, item);
    }
  }

  const remaining = spaced
    .filter((item) => item.level !== 1)
    .sort((a, b) => b.wordCount - a.wordCount);

  for (const item of remaining) {
    if (keep.size >= MAX_TOC_ITEMS) {
      break;
    }
    keep.set(item.wordIndex, item);
  }

  return [...keep.values()].sort((a, b) => a.wordIndex - b.wordIndex);
}

function normalizeLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncateLabel(value: string): string {
  if (value.length <= MAX_HEADING_LEN) {
    return value;
  }

  return `${value.slice(0, MAX_HEADING_LEN - 1)}…`;
}

function isAllCapsLine(value: string): boolean {
  const letters = value.replace(/[^A-Za-z]/g, "");
  return letters.length >= 3 && letters === letters.toUpperCase();
}

function buildItems(seeds: HeadingSeed[], totalWords: number): TOCItem[] {
  if (seeds.length === 0) {
    return [];
  }

  const sorted = [...seeds]
    .map((seed) => ({
      ...seed,
      label: truncateLabel(normalizeLabel(seed.label)),
      wordIndex: Math.max(0, Math.min(seed.wordIndex, Math.max(totalWords - 1, 0))),
    }))
    .filter((seed) => seed.label.length > 0 && !isNoisyHeading(seed.label))
    .sort((a, b) => a.wordIndex - b.wordIndex);

  const deduped: HeadingSeed[] = [];
  const seen = new Set<string>();

  for (const seed of sorted) {
    const key = seed.label.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(seed);
  }

  const baseItems = deduped.map((seed, index) => {
    const next = deduped[index + 1];
    const end = next ? next.wordIndex : totalWords;
    const wordCount = Math.max(0, end - seed.wordIndex);
    return {
      id: `toc-${index}-${seed.wordIndex}`,
      label: seed.label,
      level: seed.level,
      wordIndex: seed.wordIndex,
      wordCount,
      estimatedMinutes: Math.max(1, Math.ceil(wordCount / DEFAULT_WPM)),
    };
  });

  return pickImportantItems(baseItems, totalWords);
}

function parseMarkdownSeeds(rawText: string): HeadingSeed[] {
  const lines = rawText.split(/\r?\n/);
  let wordCursor = 0;
  const seeds: HeadingSeed[] = [];

  for (const line of lines) {
    const normalized = normalizeLabel(line);
    const markdownMatch = normalized.match(/^(#{1,3})\s+(.+)$/);
    if (markdownMatch) {
      seeds.push({
        label: markdownMatch[2],
        level: markdownMatch[1].length as 1 | 2 | 3,
        wordIndex: wordCursor,
      });
    }
    wordCursor += tokenizeText(line).length;
  }

  return seeds;
}

function parseHeuristicTextSeeds(rawText: string): HeadingSeed[] {
  const lines = rawText.split(/\r?\n/);
  let wordCursor = 0;
  const seeds: HeadingSeed[] = [];

  lines.forEach((line, lineIndex) => {
    const normalized = normalizeLabel(line);
    const next = normalizeLabel(lines[lineIndex + 1] ?? "");

    if (normalized.length === 0) {
      return;
    }

    const shortLine = normalized.length < 60;
    const lineWordCount = tokenizeText(normalized).length;
    const blankAfter = next.length === 0;
    const allCaps = isAllCapsLine(normalized);

    if ((shortLine && blankAfter && lineWordCount >= 2) || (allCaps && lineWordCount <= 8)) {
      const level: 1 | 2 | 3 = allCaps ? 1 : normalized.length < 28 ? 2 : 3;
      seeds.push({ label: normalized, level, wordIndex: wordCursor });
    }

    wordCursor += tokenizeText(line).length;
  });

  return seeds;
}

function parsePdfBlocks(rawText: string): PDFTOCBlock[] {
  if (!rawText.startsWith(PDF_BLOCKS_PREFIX)) {
    return [];
  }

  try {
    const json = rawText.slice(PDF_BLOCKS_PREFIX.length);
    const parsed = JSON.parse(json) as PDFTOCBlock[];
    return parsed.filter((block) => normalizeLabel(block.text).length > 0);
  } catch {
    return [];
  }
}

function parsePdfSeeds(rawText: string): HeadingSeed[] {
  const blocks = parsePdfBlocks(rawText);
  if (blocks.length === 0) {
    if (rawText.startsWith(PDF_BLOCKS_PREFIX)) {
      return [];
    }
    return parseHeuristicTextSeeds(rawText);
  }

  const uniqueSizes = [...new Set(blocks.map((block) => block.fontSize))]
    .filter((size) => Number.isFinite(size) && size > 0)
    .sort((a, b) => b - a);

  const top = uniqueSizes[0] ?? 0;
  const second = uniqueSizes[1] ?? top;
  const third = uniqueSizes[2] ?? second;

  const seeds: HeadingSeed[] = [];

  for (const block of blocks) {
    const label = normalizeLabel(block.text);
    const shortLine = label.length <= 90;
    const lineWordCount = tokenizeText(label).length;
    const allCaps = isAllCapsLine(label);
    const noEndingPeriod = !/[.!?]$/.test(label);
    const bigOrBold = block.fontSize >= third || block.bold;

    if (!bigOrBold && !allCaps && !(shortLine && noEndingPeriod && lineWordCount <= 10)) {
      continue;
    }

    let level: 1 | 2 | 3 = 3;
    if (block.fontSize >= top) {
      level = 1;
    } else if (block.fontSize >= second) {
      level = 2;
    }

    if (allCaps && level > 1) {
      level = 1;
    }

    seeds.push({
      label,
      level,
      wordIndex: block.wordIndex,
    });
  }

  return seeds;
}

export function parseTOC(words: string[], rawText: string, source: TOCSource): TOCItem[] {
  if (words.length === 0) {
    return [];
  }

  let seeds: HeadingSeed[] = [];

  if (source === "pdf") {
    seeds = parsePdfSeeds(rawText);
  } else {
    const markdownSeeds = parseMarkdownSeeds(rawText);
    seeds = markdownSeeds.length > 0 ? markdownSeeds : parseHeuristicTextSeeds(rawText);
  }

  return buildItems(seeds, words.length);
}

export function createPdfTOCRawText(blocks: PDFTOCBlock[]): string {
  return `${PDF_BLOCKS_PREFIX}${JSON.stringify(blocks)}`;
}
