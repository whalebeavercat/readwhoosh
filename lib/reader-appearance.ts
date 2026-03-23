export const READER_THEME_OPTIONS = [
  {
    id: "midnight",
    label: "Midnight",
    vars: {
      "--reader-bg": "#05070f",
      "--reader-fg": "#f5f7ff",
      "--reader-muted": "#9ca5bf",
      "--reader-panel-bg": "rgba(6, 11, 24, 0.78)",
      "--reader-panel-border": "rgba(173, 188, 255, 0.22)",
      "--reader-link": "#a8b5da",
      "--reader-link-hover": "#ffffff",
      "--reader-control-border": "rgba(173, 188, 255, 0.28)",
      "--reader-control-hover-bg": "rgba(163, 177, 234, 0.16)",
      "--reader-control-text": "#e8ecff",
      "--reader-progress-track": "rgba(173, 188, 255, 0.2)",
    },
  },
  {
    id: "paper",
    label: "Paper",
    vars: {
      "--reader-bg": "#f8f3e8",
      "--reader-fg": "#1c1914",
      "--reader-muted": "#645f54",
      "--reader-panel-bg": "rgba(255, 251, 241, 0.86)",
      "--reader-panel-border": "rgba(66, 57, 40, 0.18)",
      "--reader-link": "#725a2f",
      "--reader-link-hover": "#3f2f1a",
      "--reader-control-border": "rgba(66, 57, 40, 0.28)",
      "--reader-control-hover-bg": "rgba(66, 57, 40, 0.1)",
      "--reader-control-text": "#2a251d",
      "--reader-progress-track": "rgba(66, 57, 40, 0.15)",
    },
  },
  {
    id: "ocean",
    label: "Ocean",
    vars: {
      "--reader-bg": "#031722",
      "--reader-fg": "#dff8ff",
      "--reader-muted": "#84b6c8",
      "--reader-panel-bg": "rgba(4, 30, 42, 0.8)",
      "--reader-panel-border": "rgba(120, 220, 236, 0.26)",
      "--reader-link": "#83e4ff",
      "--reader-link-hover": "#ddf9ff",
      "--reader-control-border": "rgba(120, 220, 236, 0.32)",
      "--reader-control-hover-bg": "rgba(125, 220, 236, 0.15)",
      "--reader-control-text": "#d8f7ff",
      "--reader-progress-track": "rgba(120, 220, 236, 0.2)",
    },
  },
  {
    id: "forest",
    label: "Forest",
    vars: {
      "--reader-bg": "#08130d",
      "--reader-fg": "#def7e8",
      "--reader-muted": "#7da590",
      "--reader-panel-bg": "rgba(11, 30, 20, 0.82)",
      "--reader-panel-border": "rgba(128, 193, 156, 0.25)",
      "--reader-link": "#95e0b9",
      "--reader-link-hover": "#dffcec",
      "--reader-control-border": "rgba(128, 193, 156, 0.3)",
      "--reader-control-hover-bg": "rgba(128, 193, 156, 0.12)",
      "--reader-control-text": "#d6f9e7",
      "--reader-progress-track": "rgba(128, 193, 156, 0.2)",
    },
  },
  {
    id: "graphite",
    label: "Graphite",
    vars: {
      "--reader-bg": "#101214",
      "--reader-fg": "#f3f4f6",
      "--reader-muted": "#9ca3af",
      "--reader-panel-bg": "rgba(25, 28, 32, 0.82)",
      "--reader-panel-border": "rgba(148, 163, 184, 0.22)",
      "--reader-link": "#d1d5db",
      "--reader-link-hover": "#ffffff",
      "--reader-control-border": "rgba(148, 163, 184, 0.28)",
      "--reader-control-hover-bg": "rgba(148, 163, 184, 0.15)",
      "--reader-control-text": "#f3f4f6",
      "--reader-progress-track": "rgba(148, 163, 184, 0.2)",
    },
  },
] as const;

export const READER_ACCENT_OPTIONS = [
  {
    id: "ember",
    label: "Ember",
    vars: {
      "--reader-accent": "#f97316",
      "--reader-accent-strong": "#ea580c",
    },
  },
  {
    id: "cyan",
    label: "Cyan",
    vars: {
      "--reader-accent": "#06b6d4",
      "--reader-accent-strong": "#0891b2",
    },
  },
  {
    id: "lime",
    label: "Lime",
    vars: {
      "--reader-accent": "#84cc16",
      "--reader-accent-strong": "#65a30d",
    },
  },
  {
    id: "rose",
    label: "Rose",
    vars: {
      "--reader-accent": "#f43f5e",
      "--reader-accent-strong": "#e11d48",
    },
  },
  {
    id: "violet",
    label: "Violet",
    vars: {
      "--reader-accent": "#a78bfa",
      "--reader-accent-strong": "#8b5cf6",
    },
  },
  {
    id: "gold",
    label: "Gold",
    vars: {
      "--reader-accent": "#f59e0b",
      "--reader-accent-strong": "#d97706",
    },
  },
] as const;

export type ReaderThemeId = (typeof READER_THEME_OPTIONS)[number]["id"];
export type ReaderAccentId = (typeof READER_ACCENT_OPTIONS)[number]["id"];

export const DEFAULT_READER_THEME: ReaderThemeId = "midnight";
export const DEFAULT_READER_ACCENT: ReaderAccentId = "ember";
