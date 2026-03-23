(function initContentScript(globalObject) {
  const NS = globalObject.WhooshExt || {};
  if (!NS.Extractor || !NS.RSVP || !NS.Auth) {
    return;
  }

  async function handleReadRequest(mode) {
    const text = mode === "fullPage" ? NS.Extractor.extractFullPageText() : NS.Extractor.extractSelectedText();
    if (!text) {
      return { ok: false, message: "No readable text found." };
    }

    await NS.RSVP.openReaderSession({
      text,
      sourceUrl: location.href,
      title: document.title,
    });

    return { ok: true, words: text.split(/\s+/).length };
  }

  function syncTokenFromWhooshPage() {
    if (!/(^|\.)whoosh\.app$/i.test(location.hostname)) {
      return Promise.resolve({ token: null });
    }

    return new Promise((resolve) => {
      const requestId = `whoosh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const onMessage = (event) => {
        if (event.source !== window || !event.data || event.data.source !== "whoosh-token-bridge") {
          return;
        }
        if (event.data.requestId !== requestId) {
          return;
        }

        window.removeEventListener("message", onMessage);
        resolve({ token: event.data.token || null, email: event.data.email || null, avatar: event.data.avatar || null });
      };

      window.addEventListener("message", onMessage);

      const script = document.createElement("script");
      script.src = browser.runtime.getURL("content/token-bridge.js");
      script.dataset.requestId = requestId;
      script.onload = () => script.remove();
      (document.head || document.documentElement).appendChild(script);

      setTimeout(() => {
        window.removeEventListener("message", onMessage);
        resolve({ token: null });
      }, 1200);
    });
  }

  browser.runtime.onMessage.addListener((message) => {
    if (!message || typeof message !== "object") {
      return undefined;
    }

    if (message.type === "WHOOSH_TRIGGER_READ") {
      const mode = message.mode === "fullPage" ? "fullPage" : "selection";
      return handleReadRequest(mode);
    }

    if (message.type === "WHOOSH_SYNC_TOKEN") {
      return syncTokenFromWhooshPage();
    }

    return undefined;
  });
})(globalThis);
