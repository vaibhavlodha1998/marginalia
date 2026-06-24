import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-foreground/10 bg-background p-6 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
