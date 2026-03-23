type PDFItemLike = {
  str: string;
  transform: number[];
  fontName?: string;
};

type PDFSpan = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  bold: boolean;
};

export type PDFLine = {
  text: string;
  y: number;
  fontSize: number;
  bold: boolean;
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toPDFItem(item: unknown): PDFItemLike | null {
  if (!isObjectRecord(item)) {
    return null;
  }

  const str = typeof item.str === "string" ? item.str : null;
  const transform = Array.isArray(item.transform) ? item.transform : null;
  if (!str || !transform) {
    return null;
  }

  const fontName = typeof item.fontName === "string" ? item.fontName : undefined;
  return { str, transform: transform as number[], fontName };
}

function normalizeLineText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([([{"'])\s+/g, "$1")
    .trim();
}

function isAllCaps(value: string): boolean {
  const letters = value.replace(/[^A-Za-z]/g, "");
  return letters.length > 2 && letters === letters.toUpperCase();
}

function isLikelyHeading(value: string): boolean {
  const text = normalizeLineText(value);
  if (text.length === 0 || text.length > 90) {
    return false;
  }

  const wordCount = text.split(/\s+/).length;
  if (wordCount > 12) {
    return false;
  }

  return isAllCaps(text) || !/[.!?]$/.test(text);
}

function shouldMerge(prev: string, next: string): boolean {
  const prevText = normalizeLineText(prev);
  const nextText = normalizeLineText(next);

  if (prevText.length === 0 || nextText.length === 0) {
    return false;
  }

  if (isLikelyHeading(prevText) || isLikelyHeading(nextText)) {
    return false;
  }

  if (/-$/.test(prevText) && /^[a-z]/.test(nextText)) {
    return true;
  }

  if (!/[.!?:)]$/.test(prevText) && /^[a-z(]/.test(nextText)) {
    return true;
  }

  return false;
}

function combineText(prev: string, next: string): string {
  const prevText = normalizeLineText(prev);
  const nextText = normalizeLineText(next);
  if (prevText.endsWith("-") && /^[a-z]/.test(nextText)) {
    return `${prevText.slice(0, -1)}${nextText}`;
  }
  return `${prevText} ${nextText}`;
}

function normalizeForDedup(value: string): string {
  return normalizeLineText(value).toLowerCase();
}

function isLikelyPageNumber(value: string): boolean {
  const text = normalizeLineText(value);
  return /^(page\s+)?\d+$/.test(text.toLowerCase()) || /^-\s*\d+\s*-$/.test(text);
}

export function extractPDFLines(items: unknown[]): PDFLine[] {
  const spans: PDFSpan[] = [];

  for (const item of items) {
    const parsed = toPDFItem(item);
    if (!parsed) {
      continue;
    }

    const text = normalizeLineText(parsed.str);
    if (text.length === 0) {
      continue;
    }

    const x = Number(parsed.transform[4]) || 0;
    const y = Number(parsed.transform[5]) || 0;
    const sx = Math.abs(Number(parsed.transform[0]) || 0);
    const sy = Math.abs(Number(parsed.transform[3]) || 0);
    const fontSize = Math.max(sx, sy, 1);
    const bold = /(bold|black|demi|semi)/i.test(parsed.fontName ?? "");

    spans.push({ text, x, y, fontSize, bold });
  }

  spans.sort((a, b) => {
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) > 0.2) {
      return yDiff;
    }
    return a.x - b.x;
  });

  const grouped: { y: number; spans: PDFSpan[] }[] = [];

  for (const span of spans) {
    const threshold = Math.max(1.6, span.fontSize * 0.4);
    let line = grouped.find((entry) => Math.abs(entry.y - span.y) <= threshold);
    if (!line) {
      line = { y: span.y, spans: [] };
      grouped.push(line);
    }
    line.spans.push(span);
    line.y = (line.y * (line.spans.length - 1) + span.y) / line.spans.length;
  }

  grouped.sort((a, b) => b.y - a.y);

  return grouped
    .map((entry) => {
      entry.spans.sort((a, b) => a.x - b.x);
      let text = "";

      for (const span of entry.spans) {
        if (text.length === 0) {
          text = span.text;
          continue;
        }

        const noSpace = /^[,.;:!?)}\]]/.test(span.text) || /[(\[{]$/.test(text);
        text = noSpace ? `${text}${span.text}` : `${text} ${span.text}`;
      }

      const fontSize =
        entry.spans.reduce((total, span) => total + span.fontSize, 0) / entry.spans.length;

      return {
        text: normalizeLineText(text),
        y: entry.y,
        fontSize,
        bold: entry.spans.some((span) => span.bold),
      };
    })
    .filter((line) => line.text.length > 0);
}

export function cleanPDFPages(rawPages: PDFLine[][]): PDFLine[][] {
  const edgeCounts = new Map<string, number>();

  for (const page of rawPages) {
    if (page.length === 0) {
      continue;
    }
    const edgeCandidates = [page[0], page[1], page[page.length - 2], page[page.length - 1]].filter(
      Boolean,
    ) as PDFLine[];

    for (const line of edgeCandidates) {
      const key = normalizeForDedup(line.text);
      if (key.length > 0) {
        edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
      }
    }
  }

  return rawPages.map((page) => {
    const withoutNoise = page.filter((line, index) => {
      const key = normalizeForDedup(line.text);
      const nearEdge = index <= 1 || index >= page.length - 2;
      const repeatedEdge = nearEdge && (edgeCounts.get(key) ?? 0) >= 3;
      if (isLikelyPageNumber(line.text) && nearEdge) {
        return false;
      }
      if (repeatedEdge && key.length > 0) {
        return false;
      }
      return true;
    });

    const merged: PDFLine[] = [];
    for (const line of withoutNoise) {
      if (merged.length === 0) {
        merged.push(line);
        continue;
      }

      const prev = merged[merged.length - 1];
      if (shouldMerge(prev.text, line.text)) {
        merged[merged.length - 1] = {
          ...prev,
          text: combineText(prev.text, line.text),
          fontSize: Math.max(prev.fontSize, line.fontSize),
          bold: prev.bold || line.bold,
        };
      } else {
        merged.push(line);
      }
    }

    return merged.filter((line) => line.text.length > 0);
  });
}
