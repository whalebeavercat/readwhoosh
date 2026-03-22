type ControlBarProps = {
  isPlaying: boolean;
  chunkSize: 1 | 2 | 3;
  isDark: boolean;
  onPlayPause: () => void;
  onRestart: () => void;
  onBack: () => void;
  onForward: () => void;
  onChunkChange: (size: 1 | 2 | 3) => void;
  onThemeToggle: () => void;
};

export function ControlBar({
  isPlaying,
  chunkSize,
  isDark,
  onPlayPause,
  onRestart,
  onBack,
  onForward,
  onChunkChange,
  onThemeToggle,
}: ControlBarProps) {
  const buttonClass =
    "rounded border border-white/20 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-neutral-200 transition hover:border-white/45 hover:bg-white/10";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={onPlayPause} className={buttonClass}>
        {isPlaying ? "Pause" : "Play"}
      </button>
      <button onClick={onRestart} className={buttonClass}>
        Restart
      </button>
      <button onClick={onBack} className={buttonClass}>
        -5
      </button>
      <button onClick={onForward} className={buttonClass}>
        +5
      </button>

      <div className="ml-1 inline-flex rounded border border-white/20 p-1">
        {[1, 2, 3].map((size) => (
          <button
            key={size}
            onClick={() => onChunkChange(size as 1 | 2 | 3)}
            className={`rounded px-2 py-1 text-xs transition ${
              chunkSize === size
                ? "bg-red-500/80 text-white"
                : "text-neutral-300 hover:bg-white/10"
            }`}
          >
            {size}
          </button>
        ))}
      </div>

      <button onClick={onThemeToggle} className={buttonClass}>
        {isDark ? "Light" : "Dark"}
      </button>
    </div>
  );
}
