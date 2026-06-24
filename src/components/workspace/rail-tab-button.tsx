"use client";

import { cn } from "@/lib/utils/cn";

export function RailTabButton({
  label,
  active,
  dotColor,
  onClick,
}: {
  label: string;
  active: boolean;
  dotColor: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[14px] transition-colors",
        active ? "bg-surface font-semibold text-ink" : "font-medium text-ink-2 hover:bg-ink/5",
      )}
    >
      <span className={cn("size-[7px] shrink-0 rounded-sm", dotColor)} />
      {label}
    </button>
  );
}
