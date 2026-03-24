(function initPopup(globalObject) {
  const NS = globalObject.WhooshExt || {};
  const WPM_KEY = "whoosh_wpm";

  const authTitleEl = document.getElementById("authTitle");
  const authDetailEl = document.getElementById("authDetail");
  const avatarEl = document.getElementById("avatar");
  const signinLinkEl = document.getElementById("signinLink");
  const statusEl = document.getElementById("status");
  const wpmValueEl = document.getElementById("wpmValue");

  const readSelectedBtn = document.getElementById("readSelected");
  const readFullPageBtn = document.getElementById("readFullPage");
  const wpmDownBtn = document.getElementById("wpmDown");
  const wpmUpBtn = document.getElementById("wpmUp");

  function setStatus(text) {
    statusEl.textContent = text || "";
  }

  async function getActiveTab() {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  async function triggerRead(mode) {
    const tab = await getActiveTab();
    if (!tab?.id) {
      setStatus("No active tab.");
      return;
    }

    try {
      const result = await browser.tabs.sendMessage(tab.id, {
        type: "WHOOSH_TRIGGER_READ",
        mode,
      });
      if (result?.ok) {
        setStatus(`Loaded ${result.words || 0} words.`);
        window.close();
      } else {
        setStatus(result?.message || "No readable text found.");
      }
    } catch {
      setStatus("Cannot run on this page.");
    }
  }

  async function loadWpm() {
    const stored = await browser.storage.local.get(WPM_KEY);
    const value = Number(stored[WPM_KEY]);
    const wpm = Number.isFinite(value) && value >= 100 && value <= 1000 ? Math.round(value) : 380;
    wpmValueEl.textContent = String(wpm);
    return wpm;
  }

  async function setWpm(next) {
    const value = Math.max(100, Math.min(1000, Math.round(next / 10) * 10));
    await browser.storage.local.set({ [WPM_KEY]: value });
    wpmValueEl.textContent = String(value);
  }

  function renderAuth(authState) {
    if (!authState.isLoggedIn) {
      authTitleEl.textContent = "Not signed in";
      authDetailEl.textContent = "Sign in at whoosh.app";
      signinLinkEl.style.display = "inline";
      avatarEl.textContent = "W";
      avatarEl.innerHTML = "W";
      return;
    }

    authTitleEl.textContent = authState.isPro ? "Whoosh Pro" : "Whoosh Free";
    authDetailEl.textContent = authState.email || "Signed in";
    signinLinkEl.style.display = "none";
    if (authState.avatar) {
      avatarEl.innerHTML = `<img src="${authState.avatar}" alt="avatar" />`;
    } else {
      avatarEl.textContent = (authState.email || "W").slice(0, 1).toUpperCase();
    }
  }

  async function syncTokenIfPossible() {
    const tab = await getActiveTab();
    if (!tab?.id || !tab.url || !tab.url.includes("whoosh.app")) {
      return;
    }

    try {
      const result = await browser.tabs.sendMessage(tab.id, { type: "WHOOSH_SYNC_TOKEN" });
      if (result?.token) {
        await NS.Auth.setToken(result.token);
      }
    } catch {
      // Ignore sync failures in popup.
    }
  }

  readSelectedBtn.addEventListener("click", () => {
    void triggerRead("selection");
  });

  readFullPageBtn.addEventListener("click", () => {
    void triggerRead("fullPage");
  });

  wpmDownBtn.addEventListener("click", async () => {
    const current = await loadWpm();
    await setWpm(current - 10);
  });

  wpmUpBtn.addEventListener("click", async () => {
    const current = await loadWpm();
    await setWpm(current + 10);
  });

  (async () => {
    await syncTokenIfPossible();
    const authState = await NS.Auth.getAuthState();
    renderAuth(authState);
    await loadWpm();
  })();
})(globalThis);
