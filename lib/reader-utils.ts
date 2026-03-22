export function tokenizeText(text: string): string[] {
  return text.trim().match(/\S+/g) ?? [];
}

export function getOrpIndex(word: string): number {
  if (!word.length) {
    return 0;
  }

  const index = Math.floor(word.length * 0.35);
  return Math.min(Math.max(index, 0), word.length - 1);
}

export function shouldExtendDisplay(words: string[]): boolean {
  return words.some((word) => {
    const plainWord = word.replace(/^[^\w]+|[^\w]+$/g, "");
    return plainWord.length > 8 || /[.,!?;:]/.test(word);
  });
}
