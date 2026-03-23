type ControlBarProps = {
  isPlaying: boolean;
  chunkSize: 1 | 2 | 3;
  selectedTheme: string;
  selectedAccent: string;
  recallEnabled: boolean;
  themeOptions: { id: string; label: string }[];
  accentOptions: { id: string; label: string }[];
  onPlayPause: () => void;
  onRestart: () => void;
  onBack: () => void;
  onForward: () => void;
  onChunkChange: (size: 1 | 2 | 3) => void;
  onThemeChange: (themeId: string) => void;
  onAccentChange: (accentId: string) => void;
  onRecallToggle: () => void;
};

export function ControlBar({
  isPlaying,
  chunkSize,
  selectedTheme,
  selectedAccent,
  recallEnabled,
  themeOptions,
  accentOptions,
  onPlayPause,
  onRestart,
  onBack,
  onForward,
  onChunkChange,
  onThemeChange,
  onAccentChange,
  onRecallToggle,
}: ControlBarProps) {
  const buttonClass =
    "rounded border border-[var(--reader-control-border)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[var(--reader-control-text)] transition hover:bg-[var(--reader-control-hover-bg)]";

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

      <div className="ml-1 inline-flex rounded border border-[var(--reader-control-border)] p-1">
        {[1, 2, 3].map((size) => (
          <button
            key={size}
            onClick={() => onChunkChange(size as 1 | 2 | 3)}
            className={`rounded px-2 py-1 text-xs transition ${
              chunkSize === size
                ? "bg-[var(--reader-accent-strong)] text-white"
                : "text-[var(--reader-control-text)] hover:bg-[var(--reader-control-hover-bg)]"
            }`}
          >
            {size}
          </button>
        ))}
      </div>

      <div className="ml-1 inline-flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--reader-muted)]">
          Theme
        </span>
        <div className="inline-flex rounded border border-[var(--reader-control-border)] p-1">
          {themeOptions.map((theme) => (
            <button
              key={theme.id}
              onClick={() => onThemeChange(theme.id)}
              className={`rounded px-2 py-1 text-xs transition ${
                selectedTheme === theme.id
                  ? "bg-[var(--reader-accent-strong)] text-white"
                  : "text-[var(--reader-control-text)] hover:bg-[var(--reader-control-hover-bg)]"
              }`}
            >
              {theme.label}
            </button>
          ))}
        </div>
      </div>

      <div className="inline-flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--reader-muted)]">
          Accent
        </span>
        <div className="inline-flex rounded border border-[var(--reader-control-border)] p-1">
          {accentOptions.map((accent) => (
            <button
              key={accent.id}
              onClick={() => onAccentChange(accent.id)}
              className={`rounded px-2 py-1 text-xs transition ${
                selectedAccent === accent.id
                  ? "bg-[var(--reader-accent-strong)] text-white"
                  : "text-[var(--reader-control-text)] hover:bg-[var(--reader-control-hover-bg)]"
              }`}
            >
              {accent.label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={onRecallToggle} className={buttonClass}>
        Recall {recallEnabled ? "On" : "Off"}
      </button>
    </div>
  );
}
