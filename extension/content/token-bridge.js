(function whooshTokenBridge() {
  const script = document.currentScript;
  const requestId = script?.dataset?.requestId || "whoosh-token-sync";
  const token = localStorage.getItem("whoosh_token") || localStorage.getItem("token") || null;
  const email = localStorage.getItem("whoosh_email") || localStorage.getItem("email") || null;
  const avatar = localStorage.getItem("whoosh_avatar") || localStorage.getItem("avatar") || null;

  window.postMessage(
    {
      source: "whoosh-token-bridge",
      requestId,
      token,
      email,
      avatar,
    },
    window.location.origin,
  );
})();
