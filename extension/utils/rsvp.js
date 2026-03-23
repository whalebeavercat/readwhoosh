(function initRSVP(globalObject) {
  const NS = (globalObject.WhooshExt = globalObject.WhooshExt || {});

  const OVERLAY_ID = "whoosh-rsvp-overlay";
  const WPM_KEY = "whoosh_wpm";
  const THEME_KEY = "whoosh_theme";
  const ACCENT_KEY = "whoosh_accent";

  const THEMES = {
    midnight: {
      label: "Midnight",
      bg: "rgba(5, 7, 15, 0.95)",
      fg: "#f5f7ff",
      muted: "#9ca5bf",
      panelBg: "rgba(6, 11, 24, 0.78)",
      panelBorder: "rgba(173, 188, 255, 0.22)",
      controlBorder: "rgba(173, 188, 255, 0.28)",
      controlHover: "rgba(163, 177, 234, 0.16)",
      progressTrack: "rgba(173, 188, 255, 0.2)",
    },
    paper: {
      label: "Paper",
      bg: "rgba(248, 243, 232, 0.96)",
      fg: "#1c1914",
      muted: "#645f54",
      panelBg: "rgba(255, 251, 241, 0.9)",
      panelBorder: "rgba(66, 57, 40, 0.2)",
      controlBorder: "rgba(66, 57, 40, 0.28)",
      controlHover: "rgba(66, 57, 40, 0.12)",
      progressTrack: "rgba(66, 57, 40, 0.15)",
    },
    ocean: {
      label: "Ocean",
      bg: "rgba(3, 23, 34, 0.95)",
      fg: "#dff8ff",
      muted: "#84b6c8",
      panelBg: "rgba(4, 30, 42, 0.82)",
      panelBorder: "rgba(120, 220, 236, 0.26)",
      controlBorder: "rgba(120, 220, 236, 0.32)",
      controlHover: "rgba(125, 220, 236, 0.15)",
      progressTrack: "rgba(120, 220, 236, 0.2)",
    },
  };

  const ACCENTS = {
    ember: { label: "Ember", accent: "#f97316", strong: "#ea580c" },
    cyan: { label: "Cyan", accent: "#06b6d4", strong: "#0891b2" },
    lime: { label: "Lime", accent: "#84cc16", strong: "#65a30d" },
    rose: { label: "Rose", accent: "#f43f5e", strong: "#e11d48" },
  };

  let instance = null;

  function tokenize(text) {
    return String(text || "").trim().match(/\S+/g) || [];
  }

  function getOrpIndex(word) {
    if (!word) {
      return 0;
    }
    return Math.max(0, Math.min(word.length - 1, Math.floor(word.length * 0.35)));
  }

  function renderWordHTML(word) {
    const index = getOrpIndex(word);
    return `${word.slice(0, index)}<span class="whoosh-orp">${word.charAt(index)}</span>${word.slice(index + 1)}`;
  }

  function needsLongerPause(word) {
    const plain = word.replace(/^[^\w]+|[^\w]+$/g, "");
    return plain.length > 8 || /[.,!?]/.test(word);
  }

  function mountStyles() {
    if (document.getElementById("whoosh-rsvp-styles")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "whoosh-rsvp-styles";
    style.textContent = `
      #${OVERLAY_ID} {
        --whoosh-bg: rgba(5, 7, 15, 0.95);
        --whoosh-fg: #f5f7ff;
        --whoosh-muted: #9ca5bf;
        --whoosh-panel-bg: rgba(6, 11, 24, 0.78);
        --whoosh-panel-border: rgba(173, 188, 255, 0.22);
        --whoosh-control-border: rgba(173, 188, 255, 0.28);
        --whoosh-control-hover: rgba(163, 177, 234, 0.16);
        --whoosh-progress-track: rgba(173, 188, 255, 0.2);
        --whoosh-accent: #f97316;
        --whoosh-accent-strong: #ea580c;
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        background: var(--whoosh-bg);
        color: var(--whoosh-fg);
        opacity: 0;
        transition: opacity 150ms ease;
        font-family: 'Courier New', Courier, monospace;
      }
      #${OVERLAY_ID}.whoosh-open { opacity: 1; }
      #${OVERLAY_ID} .whoosh-progress-track { position: absolute; top: 0; left: 0; right: 0; height: 4px; background: var(--whoosh-progress-track); }
      #${OVERLAY_ID} .whoosh-progress-fill { height: 100%; width: 0%; background: var(--whoosh-accent-strong); transition: width 120ms linear; }
      #${OVERLAY_ID} .whoosh-word-wrap { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; text-align: center; padding: 0 24px; }
      #${OVERLAY_ID} .whoosh-word { font-size: clamp(42px, 7.2vw, 112px); font-weight: 700; letter-spacing: 0.03em; line-height: 1.1; }
      #${OVERLAY_ID} .whoosh-orp { color: var(--whoosh-accent); }
      #${OVERLAY_ID} .whoosh-controls {
        position: absolute;
        left: 50%;
        bottom: 18px;
        transform: translateX(-50%);
        width: min(980px, calc(100vw - 40px));
        border: 1px solid var(--whoosh-panel-border);
        border-radius: 12px;
        background: var(--whoosh-panel-bg);
        backdrop-filter: blur(6px);
        padding: 14px;
        transition: opacity 150ms ease;
      }
      #${OVERLAY_ID}.whoosh-controls-hidden .whoosh-controls { opacity: 0; pointer-events: none; }
      #${OVERLAY_ID} .whoosh-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
      #${OVERLAY_ID} .whoosh-buttons, #${OVERLAY_ID} .whoosh-chips { display: flex; gap: 8px; flex-wrap: wrap; }
      #${OVERLAY_ID} button {
        background: transparent;
        color: var(--whoosh-fg);
        border: 1px solid var(--whoosh-control-border);
        border-radius: 8px;
        padding: 8px 10px;
        font: 600 12px/1 'Courier New', Courier, monospace;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
      }
      #${OVERLAY_ID} button:hover { background: var(--whoosh-control-hover); }
      #${OVERLAY_ID} button.whoosh-chip-active { border-color: var(--whoosh-accent); background: var(--whoosh-control-hover); }
      #${OVERLAY_ID} .whoosh-slider-wrap { display: flex; align-items: center; gap: 10px; font-size: 12px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--whoosh-muted); }
      #${OVERLAY_ID} .whoosh-slider { width: min(240px, 54vw); accent-color: var(--whoosh-accent); }
      #${OVERLAY_ID} .whoosh-meta { font-size: 12px; color: var(--whoosh-muted); }
      #${OVERLAY_ID} .whoosh-upgrade, #${OVERLAY_ID} .whoosh-auth-note { margin-top: 8px; font-size: 12px; color: var(--whoosh-muted); }
      #${OVERLAY_ID} .whoosh-style-block { display: grid; gap: 6px; }
      #${OVERLAY_ID} .whoosh-style-label { font-size: 10px; color: var(--whoosh-muted); letter-spacing: 0.15em; text-transform: uppercase; }
      #${OVERLAY_ID} .whoosh-context {
        position: absolute;
        right: 14px;
        top: 14px;
        width: min(320px, 32vw);
        max-height: min(56vh, 640px);
        border: 1px solid var(--whoosh-panel-border);
        border-radius: 10px;
        background: var(--whoosh-panel-bg);
        backdrop-filter: blur(5px);
        padding: 10px;
        display: grid;
        gap: 8px;
      }
      #${OVERLAY_ID} .whoosh-context-title { font-size: 10px; color: var(--whoosh-muted); letter-spacing: 0.16em; text-transform: uppercase; }
      #${OVERLAY_ID} .whoosh-context-list {
        overflow-y: auto;
        max-height: min(48vh, 560px);
        border: 1px solid var(--whoosh-control-border);
        border-radius: 8px;
        padding: 8px;
        font-size: 14px;
        line-height: 1.8;
        color: var(--whoosh-muted);
      }
      #${OVERLAY_ID} .whoosh-context-word {
        display: inline;
        width: auto;
        text-align: inherit;
        text-transform: none;
        letter-spacing: 0;
        font: inherit;
        color: inherit;
        background: transparent;
        font-size: 14px;
        border: 0;
        padding: 2px;
        border-radius: 4px;
      }
      #${OVERLAY_ID} .whoosh-context-word.whoosh-current {
        border-color: transparent;
        box-shadow: inset 0 0 0 1px var(--whoosh-accent);
        background: var(--whoosh-control-hover);
        color: var(--whoosh-fg);
      }
      #${OVERLAY_ID} a { color: var(--whoosh-accent); }
    `;
    document.documentElement.appendChild(style);
  }

  async function getSavedNumber(key, fallback, min, max) {
    const stored = await browser.storage.local.get(key);
    const value = Number(stored[key]);
    if (Number.isFinite(value) && value >= min && value <= max) {
      return Math.round(value);
    }
    return fallback;
  }

  async function setSavedNumber(key, value) {
    await browser.storage.local.set({ [key]: value });
  }

  async function getSavedEnum(key, fallback, options) {
    const stored = await browser.storage.local.get(key);
    const value = stored[key];
    return typeof value === "string" && options[value] ? value : fallback;
  }

  async function setSavedEnum(key, value) {
    await browser.storage.local.set({ [key]: value });
  }

  function applyLook(overlay, themeId, accentId) {
    const theme = THEMES[themeId] || THEMES.midnight;
    const accent = ACCENTS[accentId] || ACCENTS.ember;
    overlay.style.setProperty("--whoosh-bg", theme.bg);
    overlay.style.setProperty("--whoosh-fg", theme.fg);
    overlay.style.setProperty("--whoosh-muted", theme.muted);
    overlay.style.setProperty("--whoosh-panel-bg", theme.panelBg);
    overlay.style.setProperty("--whoosh-panel-border", theme.panelBorder);
    overlay.style.setProperty("--whoosh-control-border", theme.controlBorder);
    overlay.style.setProperty("--whoosh-control-hover", theme.controlHover);
    overlay.style.setProperty("--whoosh-progress-track", theme.progressTrack);
    overlay.style.setProperty("--whoosh-accent", accent.accent);
    overlay.style.setProperty("--whoosh-accent-strong", accent.strong);

    overlay.querySelectorAll("[data-theme-chip]").forEach((el) => {
      el.classList.toggle("whoosh-chip-active", el.getAttribute("data-theme-chip") === themeId);
    });
    overlay.querySelectorAll("[data-accent-chip]").forEach((el) => {
      el.classList.toggle("whoosh-chip-active", el.getAttribute("data-accent-chip") === accentId);
    });
  }

  async function openReaderSession({ text, sourceUrl, title }) {
    mountStyles();

    const auth = await NS.Auth.getAuthState();
    let words = tokenize(text);
    let hitFreeLimit = false;

    if (!auth.isPro && words.length > NS.Auth.FREE_WORD_LIMIT) {
      words = words.slice(0, NS.Auth.FREE_WORD_LIMIT);
      hitFreeLimit = true;
    }

    if (instance) {
      instance.destroy();
      instance = null;
    }

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = `
      <div class="whoosh-progress-track"><div class="whoosh-progress-fill"></div></div>
      <div class="whoosh-word-wrap"><div class="whoosh-word">Ready</div></div>
      <aside class="whoosh-context">
        <div class="whoosh-context-title">Word Context</div>
        <div class="whoosh-context-list" data-context-list></div>
      </aside>
      <div class="whoosh-controls">
        <div class="whoosh-row">
          <div class="whoosh-buttons">
            <button data-action="play">Play</button>
            <button data-action="restart">Restart</button>
            <button data-action="close">Close</button>
            ${auth.isPro ? '<button data-action="save">Save to Vault</button>' : ""}
          </div>
          <label class="whoosh-slider-wrap">WPM <span data-wpm-value>380</span>
            <input class="whoosh-slider" data-action="wpm" type="range" min="100" max="1000" step="10" value="380" />
          </label>
        </div>
        <div class="whoosh-row">
          <div class="whoosh-style-block">
            <span class="whoosh-style-label">Theme</span>
            <div class="whoosh-chips" data-theme-group>
              ${Object.entries(THEMES).map(([id, value]) => `<button data-theme-chip="${id}">${value.label}</button>`).join("")}
            </div>
          </div>
          <div class="whoosh-style-block">
            <span class="whoosh-style-label">Accent</span>
            <div class="whoosh-chips" data-accent-group>
              ${Object.entries(ACCENTS).map(([id, value]) => `<button data-accent-chip="${id}">${value.label}</button>`).join("")}
            </div>
          </div>
        </div>
        <div class="whoosh-row">
          <div class="whoosh-meta" data-counter>Word 0 / ${words.length.toLocaleString()}</div>
          <div class="whoosh-meta">Space play/pause · ← -5 · → +5 · Esc close</div>
        </div>
        ${hitFreeLimit ? '<div class="whoosh-upgrade">You\'ve hit the free limit - <a href="https://whoosh.app" target="_blank" rel="noopener noreferrer">upgrade to Pro at whoosh.app</a> for unlimited reading.</div>' : ""}
        ${!auth.isLoggedIn ? '<div class="whoosh-auth-note">Sign in at <a href="https://whoosh.app" target="_blank" rel="noopener noreferrer">whoosh.app</a> to sync your reading and unlock Pro.</div>' : ""}
      </div>
    `;
    document.documentElement.appendChild(overlay);

    const wordEl = overlay.querySelector(".whoosh-word");
    const progressEl = overlay.querySelector(".whoosh-progress-fill");
    const counterEl = overlay.querySelector("[data-counter]");
    const sliderEl = overlay.querySelector("[data-action='wpm']");
    const wpmValueEl = overlay.querySelector("[data-wpm-value]");
    const playBtn = overlay.querySelector("[data-action='play']");
    const restartBtn = overlay.querySelector("[data-action='restart']");
    const closeBtn = overlay.querySelector("[data-action='close']");
    const saveBtn = overlay.querySelector("[data-action='save']");
    const contextListEl = overlay.querySelector("[data-context-list]");

    let index = 0;
    let isPlaying = false;
    let timeoutId = null;
    let hideControlsTimer = null;
    let wpm = await getSavedNumber(WPM_KEY, 380, 100, 1000);
    let themeId = await getSavedEnum(THEME_KEY, "midnight", THEMES);
    let accentId = await getSavedEnum(ACCENT_KEY, "ember", ACCENTS);

    sliderEl.value = String(wpm);
    wpmValueEl.textContent = String(wpm);
    applyLook(overlay, themeId, accentId);

    function scheduleHideControls() {
      overlay.classList.remove("whoosh-controls-hidden");
      if (hideControlsTimer) {
        clearTimeout(hideControlsTimer);
      }
      hideControlsTimer = setTimeout(() => {
        overlay.classList.add("whoosh-controls-hidden");
      }, 3000);
    }

    function render() {
      const word = words[index] || "Done";
      wordEl.innerHTML = words.length ? renderWordHTML(word) : "No readable text found.";
      counterEl.textContent = `Word ${Math.min(index + 1, words.length).toLocaleString()} / ${words.length.toLocaleString()}`;
      const progress = words.length > 0 ? ((index + 1) / words.length) * 100 : 0;
      progressEl.style.width = `${Math.max(0, Math.min(100, progress))}%`;
      playBtn.textContent = isPlaying ? "Pause" : "Play";
      renderContext();
    }

    function renderContext() {
      const start = Math.max(0, index - 30);
      const end = Math.min(words.length, index + 90);
      const fragment = document.createDocumentFragment();

      for (let i = start; i < end; i += 1) {
        const button = document.createElement("button");
        button.className = `whoosh-context-word${i === index ? " whoosh-current" : ""}`;
        button.setAttribute("data-word-index", String(i));
        button.textContent = `${words[i]} `;
        fragment.appendChild(button);
      }

      contextListEl.replaceChildren(fragment);
      const active = contextListEl.querySelector(".whoosh-current");
      if (active) {
        active.scrollIntoView({ block: "center" });
      }
    }

    function stopTimer() {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }

    function tick() {
      if (!isPlaying || words.length === 0) {
        return;
      }
      if (index >= words.length - 1) {
        isPlaying = false;
        render();
        return;
      }

      const base = 60000 / wpm;
      const multiplier = needsLongerPause(words[index] || "") ? 1.7 : 1;
      timeoutId = setTimeout(() => {
        index += 1;
        render();
        tick();
      }, base * multiplier);
    }

    function togglePlay() {
      if (!words.length) {
        return;
      }
      isPlaying = !isPlaying;
      render();
      stopTimer();
      if (isPlaying) {
        tick();
      }
    }

    function pause() {
      isPlaying = false;
      stopTimer();
      render();
    }

    function jumpBy(delta) {
      index = Math.max(0, Math.min(words.length - 1, index + delta));
      render();
      stopTimer();
      if (isPlaying) {
        tick();
      }
    }

    async function onSaveVault() {
      if (!auth.isPro || !auth.token) {
        return;
      }
      try {
        await NS.Auth.saveToVault({
          token: auth.token,
          title: title || document.title || "Untitled",
          sourceUrl: sourceUrl || location.href,
          text: words.join(" "),
        });
        saveBtn.textContent = "Saved";
      } catch {
        saveBtn.textContent = "Retry Save";
      }
    }

    function closeOverlay() {
      pause();
      overlay.classList.remove("whoosh-open");
      setTimeout(() => overlay.remove(), 150);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("mousemove", scheduleHideControls, true);
      instance = null;
    }

    function onKeyDown(event) {
      if (event.code === "Space") {
        event.preventDefault();
        togglePlay();
      } else if (event.code === "ArrowLeft") {
        event.preventDefault();
        jumpBy(-5);
      } else if (event.code === "ArrowRight") {
        event.preventDefault();
        jumpBy(5);
      } else if (event.code === "Escape") {
        event.preventDefault();
        closeOverlay();
      }
    }

    playBtn.addEventListener("click", togglePlay);
    restartBtn.addEventListener("click", () => {
      index = 0;
      isPlaying = false;
      stopTimer();
      render();
    });
    closeBtn.addEventListener("click", closeOverlay);

    sliderEl.addEventListener("input", async (event) => {
      const next = Number(event.target.value);
      if (!Number.isFinite(next)) {
        return;
      }
      wpm = next;
      wpmValueEl.textContent = String(next);
      await setSavedNumber(WPM_KEY, next);
    });

    overlay.querySelectorAll("[data-theme-chip]").forEach((button) => {
      button.addEventListener("click", async () => {
        themeId = button.getAttribute("data-theme-chip") || "midnight";
        applyLook(overlay, themeId, accentId);
        await setSavedEnum(THEME_KEY, themeId);
      });
    });

    overlay.querySelectorAll("[data-accent-chip]").forEach((button) => {
      button.addEventListener("click", async () => {
        accentId = button.getAttribute("data-accent-chip") || "ember";
        applyLook(overlay, themeId, accentId);
        await setSavedEnum(ACCENT_KEY, accentId);
      });
    });

    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        void onSaveVault();
      });
    }

    contextListEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const button = target.closest("[data-word-index]");
      if (!(button instanceof HTMLElement)) {
        return;
      }
      const next = Number(button.getAttribute("data-word-index"));
      if (!Number.isFinite(next)) {
        return;
      }
      index = Math.max(0, Math.min(words.length - 1, next));
      render();
      stopTimer();
      if (isPlaying) {
        tick();
      }
    });

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("mousemove", scheduleHideControls, true);

    render();
    scheduleHideControls();
    requestAnimationFrame(() => overlay.classList.add("whoosh-open"));

    instance = {
      close: closeOverlay,
      pause,
      destroy: closeOverlay,
    };

    return instance;
  }

  NS.RSVP = {
    openReaderSession,
    closeCurrent() {
      if (instance) {
        instance.close();
      }
    },
    pauseCurrent() {
      if (instance) {
        instance.pause();
      }
    },
  };
})(globalThis);
