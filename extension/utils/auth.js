(function initAuth(globalObject) {
  const NS = (globalObject.WhooshExt = globalObject.WhooshExt || {});

  const TOKEN_KEY = "whoosh_token";
  const FREE_WORD_LIMIT = 1000;

  function decodeJWT(token) {
    try {
      const payloadSegment = token.split(".")[1] || "";
      const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(
        atob(base64)
          .split("")
          .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
          .join(""),
      );
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  function getProfileFromToken(token) {
    if (!token) {
      return {
        isLoggedIn: false,
        isPro: false,
        email: null,
        avatar: null,
        token: null,
      };
    }

    const payload = decodeJWT(token) || {};
    const plan = String(payload.plan || payload.tier || payload.subscription || "").toLowerCase();
    const isPro = Boolean(payload.pro) || plan === "pro" || plan === "premium";

    return {
      isLoggedIn: true,
      isPro,
      email: payload.email || payload.user_email || null,
      avatar: payload.avatar || payload.picture || null,
      token,
    };
  }

  async function getToken() {
    const stored = await browser.storage.local.get(TOKEN_KEY);
    return stored[TOKEN_KEY] || null;
  }

  async function setToken(token) {
    if (!token) {
      await browser.storage.local.remove(TOKEN_KEY);
      return;
    }
    await browser.storage.local.set({ [TOKEN_KEY]: token });
  }

  async function getAuthState() {
    const token = await getToken();
    return getProfileFromToken(token);
  }

  async function saveToVault({ token, title, sourceUrl, text }) {
    if (!token) {
      throw new Error("Missing token");
    }

    const response = await fetch("https://whoosh.app/api/vault/documents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        sourceUrl,
        text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Vault save failed: ${response.status}`);
    }

    return response.json().catch(() => ({}));
  }

  NS.Auth = {
    TOKEN_KEY,
    FREE_WORD_LIMIT,
    decodeJWT,
    getToken,
    setToken,
    getAuthState,
    getProfileFromToken,
    saveToVault,
  };
})(globalThis);
