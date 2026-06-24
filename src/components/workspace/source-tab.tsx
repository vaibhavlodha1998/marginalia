import type { WorkspaceLesson, WorkspacePage } from "./types";

export function SourceTab({
  lesson,
  pages,
}: {
  lesson: WorkspaceLesson;
  pages: WorkspacePage[];
}) {
  return (
    <div className="mx-auto max-w-[820px] p-10 max-md:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="mb-1 font-serif text-[26px] font-semibold tracking-[-0.02em] text-ink">
            Source document
          </h2>
          <p className="font-mono text-[13px] text-ink-3">
            {lesson.sourceFilename ?? "—"} · {lesson.pages ?? pages.length} pages
          </p>
        </div>
      </div>

      <div className="rounded-[12px] border border-border bg-white p-14 shadow-[0_6px_24px_rgba(44,39,34,0.07)] max-md:p-7">
        {pages.length === 0 ? (
          <p className="text-[15px] text-ink-3">No extracted text available.</p>
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
    </div>
  );
}
