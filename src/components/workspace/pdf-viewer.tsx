"use client";

import { useEffect, useRef, useState } from "react";

// Render pages only as they scroll into view, at a capped pixel ratio, so a long
// PDF stays light on phones instead of rasterizing every page up front.
export function PdfViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let io: IntersectionObserver | undefined;
    const container = containerRef.current;

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

        const doc = await pdfjs.getDocument({ url }).promise;
        if (cancelled || !container) return;

        const targetWidth = Math.min(820, (container.clientWidth ?? 820) - 4);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rendered = new Set<number>();

        // Placeholder per page, sized from page 1's aspect ratio.
        const first = await doc.getPage(1);
        const fv = first.getViewport({ scale: 1 });
        const aspect = fv.height / fv.width;

        for (let i = 1; i <= doc.numPages; i++) {
          const slot = document.createElement("div");
          slot.dataset.page = String(i);
          slot.style.width = "100%";
          slot.style.maxWidth = `${targetWidth}px`;
          slot.style.height = `${targetWidth * aspect}px`;
          slot.className =
            "rounded-[10px] border border-border-strong bg-surface-2 shadow-[0_4px_18px_rgba(44,39,34,0.06)]";
          container.appendChild(slot);
        }

        const renderPage = async (slot: HTMLElement) => {
          const i = Number(slot.dataset.page);
          if (!i || rendered.has(i)) return;
          rendered.add(i);
          const page = await doc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (targetWidth / base.width) * dpr });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.mixBlendMode = "multiply";
          const ctx = canvas.getContext("2d");
          if (ctx) await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          if (!cancelled) {
            slot.style.height = "auto";
            slot.replaceChildren(canvas);
          }
        };

        io = new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (e.isIntersecting) {
                io?.unobserve(e.target);
                void renderPage(e.target as HTMLElement);
              }
            }
          },
          { root: null, rootMargin: "600px 0px" },
        );
        container.querySelectorAll<HTMLElement>("[data-page]").forEach((s) => io?.observe(s));

        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      io?.disconnect();
      if (container) container.innerHTML = "";
    };
  }, [url]);

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div ref={containerRef} className="flex w-full flex-col items-center gap-6" />
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
