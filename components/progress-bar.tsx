type ProgressBarProps = {
  current: number;
  total: number;
};

export function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = total === 0 ? 0 : Math.min((current / total) * 100, 100);

  return (
    <div className="h-1 w-full bg-white/10">
      <div
        className="h-full bg-red-400/85 transition-[width] duration-150"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
