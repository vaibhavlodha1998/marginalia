import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmptyState() {
  return (
    <div className="rounded-2xl border-[1.5px] border-dashed border-[#d0c4ad] bg-surface-2 px-10 py-[72px] text-center">
      <div className="mx-auto mb-[22px] flex h-[72px] w-[60px] flex-col justify-end gap-[5px] rounded-[6px_10px_10px_6px] border border-border border-l-4 border-l-primary bg-surface p-2.5">
        <div className="h-[3px] rounded-sm bg-[#e0d5c1]" />
        <div className="h-[3px] w-[70%] rounded-sm bg-[#e0d5c1]" />
      </div>
      <h2 className="mb-2 font-serif text-2xl font-semibold text-ink">
        No lessons yet
      </h2>
      <p className="mx-auto mb-[26px] max-w-[380px] text-[15px] leading-relaxed text-ink-2">
        Upload a PDF — a chapter, a paper, a set of notes — and Marginalia will
        shape it into a guided lesson you can work through at your own pace.
      </p>
      <Link href="/new">
        <Button>Upload your first PDF</Button>
      </Link>
    </div>
  );
}
