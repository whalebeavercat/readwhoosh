'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { TOCSidebar } from "@/components/toc-sidebar";
import { cleanPDFPages, extractPDFLines } from "@/lib/pdf-cleaner";
import { createPdfTOCRawText } from "@/lib/parseTOC";
import { useReaderText } from "@/lib/reader-context";
import { tokenizeText } from "@/lib/reader-utils";
import { useTOC } from "@/lib/useTOC";

type UploadTab = "text" | "image" | "pdf";
const DEFAULT_WPM = 380;

export default function Home() {
  const router = useRouter();
  const {
    text,
    source,
    tocRawText,
    startWordIndex,
    setText,
    setSource,
    setTocRawText,
    setStartWordIndex,
    setPdfPreviewUrl,
    setPdfPageLocations,
  } = useReaderText();
  const [activeTab, setActiveTab] = useState<UploadTab>("text");
  const [status, setStatus] = useState("Paste or upload content to begin.");
  const [isProcessing, setIsProcessing] = useState(false);
  const pdfObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (pdfObjectUrlRef.current) {
        URL.revokeObjectURL(pdfObjectUrlRef.current);
      }
    };
  }, []);

  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const safeText = isHydrated ? text : "";
  const safeSource = isHydrated ? source : "text";
  const safeTOCRawText = isHydrated ? tocRawText : "";
  const safeStartWordIndex = isHydrated ? startWordIndex : 0;

  const wordCount = useMemo(() => tokenizeText(safeText).length, [safeText]);
  const { items: tocItems, hasTOC, emptyMessage } = useTOC(
    safeText,
    safeTOCRawText,
    safeSource,
  );

  const handleTextChange = (value: string) => {
    setText(value);
    setSource("text");
    setTocRawText(value);
    setStartWordIndex(0);
    setPdfPageLocations([]);
    setPdfPreviewUrl(null);
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) {
      return;
    }

    setIsProcessing(true);
    setStatus("Running OCR with Tesseract...");

    try {
      const Tesseract = await import("tesseract.js");
      const result = await Tesseract.recognize(file, "eng", {
        logger: (info) => {
          if (info.status === "recognizing text") {
            setStatus(`OCR progress: ${Math.round(info.progress * 100)}%`);
          }
        },
      });

      const extracted = result.data.text.trim();
      setText(extracted);
      setSource("image");
      setTocRawText(extracted);
      setStartWordIndex(0);
      setPdfPageLocations([]);
      setPdfPreviewUrl(null);
      setStatus(`OCR complete. Extracted ${tokenizeText(extracted).length} words.`);
    } catch {
      setStatus("Could not extract text from image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePdfUpload = async (file: File | null) => {
    if (!file) {
      return;
    }

    setIsProcessing(true);
    setStatus("Parsing PDF pages...");

    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      const fileBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: fileBuffer }).promise;
      const rawPages: ReturnType<typeof extractPDFLines>[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        rawPages.push(extractPDFLines(textContent.items));
        setStatus(`Extracting PDF page ${pageNum}/${pdf.numPages}...`);
      }

      const cleanedPages = cleanPDFPages(rawPages);
      const pages: string[] = [];
      const pageLocations: {
        page: number;
        startWord: number;
        endWord: number;
        wordCount: number;
      }[] = [];
      const tocBlocks: {
        text: string;
        wordIndex: number;
        fontSize: number;
        bold: boolean;
      }[] = [];
      let wordCursor = 0;

      for (let pageIndex = 0; pageIndex < cleanedPages.length; pageIndex += 1) {
        const pageLines = cleanedPages[pageIndex];
        const pageParts: string[] = [];
        const pageStart = wordCursor;

        for (const line of pageLines) {
          const value = line.text;
          const wordLen = tokenizeText(value).length;
          if (wordLen === 0) {
            continue;
          }

          pageParts.push(value);

          const compact = value.length <= 96 && wordLen <= 12;
          const likelyHeadingByShape = compact && !/[.!?]$/.test(value);
          const likelyHeadingByStyle = compact && (line.bold || line.fontSize >= 13);

          if (likelyHeadingByShape || likelyHeadingByStyle) {
            tocBlocks.push({
              text: value,
              wordIndex: wordCursor,
              fontSize: Number.isFinite(line.fontSize) && line.fontSize > 0 ? line.fontSize : 12,
              bold: line.bold,
            });
          }

          wordCursor += wordLen;
        }

        pages.push(pageParts.join("\n"));
        pageLocations.push({
          page: pageIndex + 1,
          startWord: pageStart,
          endWord: Math.max(pageStart, wordCursor - 1),
          wordCount: Math.max(0, wordCursor - pageStart),
        });
      }

      const extracted = pages.join("\n").trim();
      const slimTOCBlocks = tocBlocks.slice(0, 1200);
      setText(extracted);
      setSource("pdf");
      setTocRawText(createPdfTOCRawText(slimTOCBlocks));
      setStartWordIndex(0);
      setPdfPageLocations(pageLocations.filter((page) => page.wordCount > 0));

      if (pdfObjectUrlRef.current) {
        URL.revokeObjectURL(pdfObjectUrlRef.current);
      }
      const nextPdfUrl = URL.createObjectURL(file);
      pdfObjectUrlRef.current = nextPdfUrl;
      setPdfPreviewUrl(nextPdfUrl);

      setStatus(`PDF complete. Extracted ${tokenizeText(extracted).length} words.`);
    } catch {
      setStatus("Could not extract text from PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-10 text-neutral-100 sm:px-8">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 rounded-2xl border border-white/10 bg-black/40 p-5 shadow-[0_0_90px_rgba(0,0,0,0.55)] backdrop-blur sm:p-8">
        <header className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-neutral-400">
            WhooshRead
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Upload text, lock focus, and read faster.
          </h1>
          <p className="max-w-2xl text-sm text-neutral-400 sm:text-base">
            Use plain text, image OCR, or PDF extraction. Preview and edit your
            text before launching full-screen reading mode.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-[260px_320px_1fr]">
          {hasTOC ? (
            <div className="md:col-span-1">
              <TOCSidebar
                items={tocItems}
                currentWordIndex={safeStartWordIndex}
                wpm={DEFAULT_WPM}
                onJump={setStartWordIndex}
                title="Outline"
              />
            </div>
          ) : (
            <div className="hidden rounded border border-white/10 bg-black/35 p-4 md:block">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                Outline
              </p>
              <p className="mt-3 text-sm text-neutral-400">{emptyMessage}</p>
            </div>
          )}

          <div className="space-y-3">
            <div className="inline-flex rounded border border-white/15 bg-white/5 p-1">
              {(["text", "image", "pdf"] as UploadTab[]).map((tab) => (
                <button
                  key={tab}
                onClick={() => setActiveTab(tab)}
                  className={`rounded px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                    activeTab === tab
                      ? "bg-red-500/85 text-white"
                      : "text-neutral-300 hover:bg-white/10"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "text" && (
              <textarea
                value={safeText}
                onChange={(event) => handleTextChange(event.target.value)}
                placeholder="Paste your content here..."
                className="h-64 w-full rounded border border-white/15 bg-black/55 p-3 text-sm text-neutral-100 outline-none ring-red-400/70 transition focus:ring"
              />
            )}

            {activeTab === "image" && (
              <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded border border-dashed border-white/20 bg-white/5 p-5 text-center text-sm text-neutral-300 hover:bg-white/10">
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">
                  Image OCR
                </span>
                <span className="mt-2">Click to upload an image file</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    void handleImageUpload(event.target.files?.[0] ?? null);
                  }}
                />
              </label>
            )}

            {activeTab === "pdf" && (
              <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded border border-dashed border-white/20 bg-white/5 p-5 text-center text-sm text-neutral-300 hover:bg-white/10">
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">
                  PDF Extract
                </span>
                <span className="mt-2">Click to upload a PDF file</span>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => {
                    void handlePdfUpload(event.target.files?.[0] ?? null);
                  }}
                />
              </label>
            )}

            <p className="text-xs text-neutral-500">{status}</p>
            {!hasTOC && wordCount > 0 && (
              <p className="rounded border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-400">
                {emptyMessage}
              </p>
            )}

            {hasTOC && safeStartWordIndex > 0 && (
              <p className="rounded border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-300">
                Starting from word {safeStartWordIndex + 1} based on your selected section.
              </p>
            )}

            <button
              onClick={() => router.push("/reader")}
              disabled={wordCount === 0 || isProcessing}
              className="w-full rounded border border-red-400/70 bg-red-500/85 px-4 py-3 font-mono text-xs uppercase tracking-[0.25em] text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:border-white/15 disabled:bg-white/10 disabled:text-neutral-500"
            >
              Start Reading
            </button>
          </div>

          <div className="rounded border border-white/10 bg-black/40 p-4">
            <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-neutral-400">
              <span>Live Preview</span>
              <span>{wordCount} words</span>
            </div>
            <textarea
              value={safeText}
              onChange={(event) => handleTextChange(event.target.value)}
              placeholder="Extracted text appears here..."
              className="h-[26rem] w-full resize-none rounded border border-white/10 bg-black/55 p-4 font-mono text-sm leading-7 text-neutral-100 outline-none ring-red-400/70 transition focus:ring"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
