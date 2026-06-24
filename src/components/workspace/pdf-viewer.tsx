"use client";

import { useEffect, useRef, useState } from "react";

export function PdfViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

        const doc = await pdfjs.getDocument({ url }).promise;
        if (cancelled) return;

        const targetWidth = Math.min(820, (container?.clientWidth ?? 820) - 4);
        const dpr = window.devicePixelRatio || 1;

        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) break;
          const page = await doc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const scale = (targetWidth / base.width) * dpr;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.maxWidth = `${targetWidth}px`;
          // Blend the page's white into the paper background.
          canvas.style.mixBlendMode = "multiply";
          canvas.className =
            "rounded-[10px] border border-border-strong shadow-[0_4px_18px_rgba(44,39,34,0.06)]";
          container?.appendChild(canvas);

          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          }
        }
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      if (container) container.innerHTML = "";
    };
  }, [url]);

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div
        ref={containerRef}
        className="flex w-full flex-col items-center gap-6"
      />
      {status === "loading" && (
        <p className="text-[14px] text-ink-3">Rendering the document…</p>
      )}
      {status === "error" && (
        <p className="text-[14px] text-ink-3">
          Couldn&apos;t render the PDF.{" "}
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-primary"
          >
            Open it directly
          </a>
          .
        </p>
      )}
    </div>
  );
}
