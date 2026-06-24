import Link from "next/link";

export default function NewLessonPage() {
  return (
    <div className="flex flex-1 flex-col bg-paper">
      <header className="flex items-center gap-3.5 border-b border-border-strong px-11 py-[22px] max-md:px-6">
        <Link href="/" className="text-[13.5px] text-ink-2 hover:text-ink">
          ← Library
        </Link>
        <span className="text-border-muted">/</span>
        <span className="font-serif text-[16px] font-semibold text-ink">
          New lesson
        </span>
      </header>
      <div className="flex flex-1 items-center justify-center p-10 text-center">
        <div>
          <div className="mb-3.5 text-[12.5px] font-semibold uppercase tracking-[0.06em] text-ink-3">
            Step 1 of 3 · Upload
          </div>
          <p className="text-[15px] text-ink-2">PDF upload arrives in the next step.</p>
        </div>
      </div>
    </div>
  );
}
