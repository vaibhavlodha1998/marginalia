"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ingestLesson } from "@/app/actions/upload";
import { UploadStep } from "./upload-step";

const MAX_BYTES = 40 * 1024 * 1024;

type Phase = "uploading" | "parsing";

export function UploadDropzone({ userId }: { userId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "reading">("idle");
  const [phase, setPhase] = useState<Phase>("uploading");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.type !== "application/pdf") {
      setError("Please choose a PDF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("PDF must be under 40 MB.");
      return;
    }

    setFileName(file.name);
    setPhase("uploading");
    setStatus("reading");
    try {
      const supabase = createClient();
      const path = `${userId}/${crypto.randomUUID()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("pdfs")
        .upload(path, file, { contentType: "application/pdf" });
      if (upErr) throw upErr;

      setPhase("parsing");
      const { lessonId } = await ingestLesson({ path, filename: file.name });

      router.replace(`/lessons/${lessonId}/plan`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setStatus("idle");
    }
  }

  if (status === "reading") {
    return (
      <div className="w-full max-w-[540px]">
        <div className="rounded-[18px] border border-border bg-surface p-9 shadow-[0_20px_50px_rgba(44,39,34,0.08)]">
          <div className="mb-7 flex items-center gap-[18px]">
            <div className="relative h-[70px] w-14 shrink-0 overflow-hidden rounded-[5px_8px_8px_5px] border border-border border-l-[3px] border-l-primary bg-surface-2">
              <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-b from-primary/45 to-transparent [animation:mg-scan_1.6s_linear_infinite]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold text-ink">
                {fileName}
              </div>
              <div className="font-mono text-[13px] text-ink-3">Reading…</div>
            </div>
            <span className="size-[22px] shrink-0 rounded-full border-[2.5px] border-border-muted border-t-primary [animation:mg-spin_.8s_linear_infinite]" />
          </div>
          <div className="flex flex-col gap-3.5 text-[14px]">
            <UploadStep done={phase === "parsing"} active={phase === "uploading"} label="Uploading your document" />
            <UploadStep active={phase === "parsing"} label="Extracting text from every page" />
          </div>
        </div>
        <p className="mt-[18px] text-center text-[13px] text-ink-3">
          Reading your document — this can take a few minutes for longer PDFs.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[560px] text-center">
      <div className="mb-3.5 text-[12.5px] font-semibold uppercase tracking-[0.06em] text-ink-3">
        Step 1 of 3 · Upload
      </div>
      <h1 className="mb-2.5 font-serif text-[30px] font-semibold tracking-[-0.02em] text-ink">
        Add the document you want to learn
      </h1>
      <p className="mb-8 text-[15px] leading-relaxed text-ink-2">
        A textbook chapter, a research paper, lecture notes — anything you&apos;d
        like turned into a guided lesson.
      </p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files[0]);
        }}
        className="w-full cursor-pointer rounded-2xl border-[1.5px] border-dashed border-[#c2b59c] bg-surface-3 px-10 py-[54px] transition-colors hover:border-primary hover:bg-surface-2"
      >
        <div className="mx-auto mb-[18px] flex size-14 items-center justify-center rounded-[14px] bg-[#eceef6]">
          <span className="text-[26px] leading-none text-primary">↑</span>
        </div>
        <div className="mb-1.5 text-[16px] font-semibold text-ink">
          Drop a PDF here, or click to browse
        </div>
        <div className="text-[13px] text-ink-3">PDF up to 40 MB</div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {error && <p className="mt-4 text-[13.5px] text-wrong">{error}</p>}

      <div className="mt-[18px] flex items-center justify-center gap-2 text-[12.5px] text-ink-3">
        <span className="size-1.5 shrink-0 rounded-full bg-easy" />
        Your document stays private — we never use it to train models.
      </div>
    </div>
  );
}
