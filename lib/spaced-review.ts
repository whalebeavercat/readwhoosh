import type { TOCItem } from "@/lib/parseTOC";

export type ReviewRating = "again" | "hard" | "good" | "easy";

export type ReviewCard = {
  id: string;
  docId: string;
  headingId: string;
  label: string;
  level: 1 | 2 | 3;
  wordIndex: number;
  dueAt: number;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  lastReviewedAt: number | null;
};

const STORAGE_KEY = "whoosh-spaced-review-v1";

function hashText(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0).toString(36);
}

export function getDocId(text: string): string {
  return `doc-${hashText(text.trim().slice(0, 12000))}`;
}

export function buildCardsFromTOC(docId: string, items: TOCItem[]): ReviewCard[] {
  const now = Date.now();
  return items.map((item) => ({
    id: `${docId}-${item.wordIndex}`,
    docId,
    headingId: item.id,
    label: item.label,
    level: item.level,
    wordIndex: item.wordIndex,
    dueAt: now,
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lastReviewedAt: null,
  }));
}

export function loadAllCards(): ReviewCard[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as ReviewCard[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAllCards(cards: ReviewCard[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function mergeDocCards(existing: ReviewCard[], generated: ReviewCard[]): ReviewCard[] {
  const mergedById = new Map(existing.map((card) => [card.id, card]));
  for (const card of generated) {
    if (!mergedById.has(card.id)) {
      mergedById.set(card.id, card);
    }
  }
  return [...mergedById.values()];
}

function applyReview(card: ReviewCard, rating: ReviewRating): ReviewCard {
  const now = Date.now();
  if (rating === "again") {
    return {
      ...card,
      dueAt: now + 10 * 60 * 1000,
      intervalDays: 0,
      easeFactor: Math.max(1.3, card.easeFactor - 0.2),
      repetitions: 0,
      lastReviewedAt: now,
    };
  }

  const intervalBase = card.intervalDays <= 0 ? 1 : card.intervalDays;
  const factor = rating === "hard" ? 1.2 : rating === "good" ? card.easeFactor : card.easeFactor + 0.25;
  const nextInterval = Math.max(1, Math.round(intervalBase * factor));

  return {
    ...card,
    dueAt: now + nextInterval * 24 * 60 * 60 * 1000,
    intervalDays: nextInterval,
    easeFactor: Math.max(1.3, card.easeFactor + (rating === "easy" ? 0.15 : rating === "hard" ? -0.1 : 0)),
    repetitions: card.repetitions + 1,
    lastReviewedAt: now,
  };
}

export function rateCard(cards: ReviewCard[], cardId: string, rating: ReviewRating): ReviewCard[] {
  return cards.map((card) => (card.id === cardId ? applyReview(card, rating) : card));
}

export function getDueCards(cards: ReviewCard[], docId: string): ReviewCard[] {
  const now = Date.now();
  return cards
    .filter((card) => card.docId === docId && card.dueAt <= now)
    .sort((a, b) => a.wordIndex - b.wordIndex);
}
