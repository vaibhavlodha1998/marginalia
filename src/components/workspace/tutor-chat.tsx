"use client";

import { MessageCircle } from "lucide-react";

const SUGGESTED = ["Hint, please", "Explain simply"];

export function TutorChat({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="absolute bottom-6 right-6 flex items-center gap-2 rounded-[26px] bg-primary px-5 py-3 text-[14px] font-semibold text-on-primary shadow-[0_10px_26px_rgba(44,39,34,0.22)]"
      >
        <MessageCircle className="size-4" />
        Ask your tutor
      </button>
    );
  }

  return (
    <aside className="flex w-[340px] flex-none flex-col border-l border-border-strong bg-surface-2 max-lg:w-[300px] max-md:fixed max-md:inset-0 max-md:z-40 max-md:w-full">
      <div className="flex items-center justify-between border-b border-border-strong px-[18px] pb-3.5 pt-[18px]">
        <div className="flex items-center gap-2.5">
          <div className="flex size-[30px] items-center justify-center rounded-[9px] bg-primary font-serif text-[14px] font-semibold text-on-primary">
            T
          </div>
          <div>
            <div className="text-[14px] font-semibold text-ink">Your tutor</div>
            <div className="flex items-center gap-1.5 text-[11.5px] text-easy">
              <span className="size-1.5 rounded-full bg-easy" />
              Here to help
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          title="Collapse"
          className="px-2 py-1 text-[18px] leading-none text-ink-3 hover:text-ink-2"
        >
          ›
        </button>
      </div>

      <div className="mg-scroll flex flex-1 flex-col gap-3.5 overflow-y-auto p-[18px]">
        <div className="max-w-[86%] self-start rounded-[14px_14px_14px_4px] border border-border bg-surface px-3.5 py-[11px] text-[13.5px] leading-[1.55] text-ink">
          Hi! I&apos;m your tutor. Once the quiz begins, ask me for a hint or to
          explain anything — I&apos;ll never give the answer away.
        </div>
      </div>

      <div className="border-t border-border-strong px-4 pb-4 pt-3">
        <div className="mb-2.5 flex gap-2">
          {SUGGESTED.map((s) => (
            <span
              key={s}
              className="rounded-2xl border border-[#d7dcec] bg-[#eceef6] px-3 py-1.5 text-[12px] text-primary"
            >
              {s}
            </span>
          ))}
        </div>
        <div className="flex items-end gap-2 rounded-[12px] border border-border bg-surface py-2 pl-3 pr-2">
          <input
            disabled
            placeholder="Tutor chat arrives in the next step…"
            className="flex-1 bg-transparent py-1 text-[13.5px] text-ink outline-none placeholder:text-ink-3"
          />
        </div>
        <p className="mt-2 text-center text-[10.5px] text-ink-4">
          Your tutor gives hints and explanations — never the answer.
        </p>
      </div>
    </aside>
  );
}
