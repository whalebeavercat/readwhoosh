importScripts("../polyfill/browser-polyfill.js");

const CONTEXT_MENU_ID = "whoosh-speed-read-selection";

async function ensureContextMenu() {
  try {
    await browser.contextMenus.remove(CONTEXT_MENU_ID);
  } catch {
    // No-op if it doesn't exist.
  }

  await browser.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "⚡ Whoosh — Speed Read Selection",
    contexts: ["selection"],
  });
}

browser.runtime.onInstalled.addListener(() => {
  void ensureContextMenu();
});

browser.runtime.onStartup.addListener(() => {
  void ensureContextMenu();
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id || info.menuItemId !== CONTEXT_MENU_ID) {
    return;
  }

  void browser.tabs.sendMessage(tab.id, {
    type: "WHOOSH_TRIGGER_READ",
    mode: "selection",
  });
});
