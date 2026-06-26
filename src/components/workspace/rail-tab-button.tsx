"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function RailTabButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[14px] transition-colors max-md:gap-2 max-md:px-2.5",
        active
          ? "bg-surface font-semibold text-ink"
          : "font-medium text-ink-2 hover:bg-ink/5",
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-ink-3")} />
      {label}
    </button>
  );
}
