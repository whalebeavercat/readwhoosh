'use client';

import type { ReviewCard, ReviewRating } from "@/lib/spaced-review";

type RecallCheckModalProps = {
  sectionLabel: string;
  isOpen: boolean;
  onClose: () => void;
  onRate: (rating: ReviewRating) => void;
};

const RATING_OPTIONS: { id: ReviewRating; label: string }[] = [
  { id: "again", label: "Again" },
  { id: "hard", label: "Hard" },
  { id: "good", label: "Good" },
  { id: "easy", label: "Easy" },
];

export function RecallCheckModal({ sectionLabel, isOpen, onClose, onRate }: RecallCheckModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-xl border border-[var(--reader-panel-border)] bg-[var(--reader-panel-bg)] p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--reader-muted)]">
          Recall Check
        </p>
        <h2 className="mt-2 text-xl font-semibold text-[var(--reader-fg)]">{sectionLabel}</h2>
        <div className="mt-4 space-y-2 text-sm text-[var(--reader-muted)]">
          <p>- What is the main idea of this section?</p>
          <p>- Name two key details you remember.</p>
          <p>- What should you do or conclude from it?</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {RATING_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => onRate(option.id)}
              className="rounded border border-[var(--reader-control-border)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[var(--reader-control-text)] transition hover:bg-[var(--reader-control-hover-bg)]"
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-4 text-xs text-[var(--reader-link)] transition-colors hover:text-[var(--reader-link-hover)]"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

type SpacedReviewQueueProps = {
  dueCards: ReviewCard[];
  onRate: (cardId: string, rating: ReviewRating) => void;
};

export function SpacedReviewQueue({ dueCards, onRate }: SpacedReviewQueueProps) {
  return (
    <div className="rounded border border-[var(--reader-control-border)] bg-[var(--reader-control-hover-bg)]/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--reader-muted)]">
          Spaced Review Queue
        </p>
        <span className="text-xs text-[var(--reader-muted)]">{dueCards.length} due</span>
      </div>

      {dueCards.length === 0 ? (
        <p className="text-xs text-[var(--reader-muted)]">No cards due right now. Keep reading.</p>
      ) : (
        <div className="space-y-2">
          {dueCards.slice(0, 3).map((card) => (
            <div key={card.id} className="rounded border border-[var(--reader-control-border)] bg-black/15 p-2">
              <p className="truncate text-sm text-[var(--reader-fg)]">{card.label}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {RATING_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => onRate(card.id, option.id)}
                    className="rounded border border-[var(--reader-control-border)] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--reader-control-text)] hover:bg-[var(--reader-control-hover-bg)]"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
