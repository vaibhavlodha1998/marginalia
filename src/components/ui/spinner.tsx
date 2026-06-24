import { cn } from "@/lib/utils/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-5 rounded-full border-[2.5px] border-border-muted border-t-primary [animation:mg-spin_.8s_linear_infinite]",
        className,
      )}
      aria-label="Loading"
      role="status"
    />
  );
}
