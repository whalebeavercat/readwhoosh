type ProgressBarProps = {
  current: number;
  total: number;
};

export function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = total === 0 ? 0 : Math.min((current / total) * 100, 100);

  return (
    <div className="h-1 w-full bg-[var(--reader-progress-track)]">
      <div
        className="h-full bg-[var(--reader-accent-strong)] transition-[width] duration-150"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
