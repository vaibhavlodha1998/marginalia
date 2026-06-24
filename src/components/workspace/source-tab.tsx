import { PdfViewer } from "./pdf-viewer";
import type { WorkspaceLesson, WorkspacePage } from "./types";

export function SourceTab({
  lesson,
  pages,
  pdfUrl,
}: {
  lesson: WorkspaceLesson;
  pages: WorkspacePage[];
  pdfUrl: string | null;
}) {
  return (
    <div className="mx-auto flex h-full max-w-[900px] flex-col p-10 max-md:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="mb-1 font-serif text-[26px] font-semibold tracking-[-0.02em] text-ink">
            Source document
          </h2>
          <p className="font-mono text-[13px] text-ink-3">
            {lesson.sourceFilename ?? "—"} · {lesson.pages ?? pages.length} pages
          </p>
        </div>
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[13px] font-semibold text-primary"
          >
            Open ↗
          </a>
        )}
      </div>

      {pdfUrl ? (
        <PdfViewer url={pdfUrl} />
      ) : (
        <div className="mg-scroll flex-1 overflow-y-auto rounded-[12px] border border-border bg-white p-12 shadow-[0_6px_24px_rgba(44,39,34,0.07)] max-md:p-6">
          {pages.length === 0 ? (
            <p className="text-[15px] text-ink-3">No source available.</p>
          ) : (
            <div className="flex flex-col gap-7">
              {pages.map((page) => (
                <div key={page.pageNo}>
                  <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-4">
                    Page {page.pageNo}
                  </div>
                  <p className="whitespace-pre-wrap font-serif text-[15px] leading-[1.85] text-[#3a342c]">
                    {page.text || "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
