(function initExtractor(globalObject) {
  const NS = (globalObject.WhooshExt = globalObject.WhooshExt || {});

  const REMOVE_SELECTORS = [
    "script",
    "style",
    "noscript",
    "svg",
    "canvas",
    "iframe",
    "nav",
    "footer",
    "header",
    "aside",
    "[role='navigation']",
    "[aria-label*='breadcrumb' i]",
    "[class*='sidebar' i]",
    "[id*='sidebar' i]",
    "[class*='comment' i]",
    "[id*='comment' i]",
    "[class*='related' i]",
    "[id*='related' i]",
    "[class*='ad-' i]",
    "[id*='ad-' i]",
  ];

  function cleanText(rawText) {
    return String(rawText || "")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[^\S\r\n]+/g, " ")
      .replace(/[\t\f\v]+/g, " ")
      .replace(/\s*\n\s*/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \u00A0]{2,}/g, " ")
      .trim();
  }

  function scoreElement(node) {
    if (!node) {
      return 0;
    }
    const text = cleanText(node.innerText || node.textContent || "");
    if (text.length < 240) {
      return 0;
    }
    const punctuation = (text.match(/[.!?]/g) || []).length;
    const paragraphs = node.querySelectorAll("p").length;
    return text.length + punctuation * 18 + paragraphs * 55;
  }

  function cloneAndPrune(node) {
    const clone = node.cloneNode(true);
    clone.querySelectorAll(REMOVE_SELECTORS.join(",")).forEach((el) => el.remove());
    return clone;
  }

  function pickContentRoot() {
    const preferred = [
      ...document.querySelectorAll("article"),
      ...document.querySelectorAll("main"),
      ...document.querySelectorAll("[role='main']"),
    ];

    let best = null;
    let bestScore = 0;

    for (const node of preferred) {
      const score = scoreElement(node);
      if (score > bestScore) {
        best = node;
        bestScore = score;
      }
    }

    if (best) {
      return best;
    }

    const candidateSelector =
      "article, main, section, div, [role='main'], [class*='content' i], [id*='content' i], [class*='post' i], [class*='article' i]";
    for (const node of document.querySelectorAll(candidateSelector)) {
      const score = scoreElement(node);
      if (score > bestScore) {
        best = node;
        bestScore = score;
      }
    }

    return best || document.body;
  }

  function extractFullPageText() {
    const root = pickContentRoot();
    const cleanRoot = cloneAndPrune(root);
    const text = cleanText(cleanRoot.innerText || cleanRoot.textContent || "");
    return text;
  }

  function extractSelectedText() {
    const selected = window.getSelection();
    return cleanText(selected ? selected.toString() : "");
  }

  NS.Extractor = {
    cleanText,
    extractSelectedText,
    extractFullPageText,
  };
})(globalThis);
