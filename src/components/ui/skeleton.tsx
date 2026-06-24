import { cn } from "@/lib/utils/cn";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[12px] border border-border bg-surface-2 [animation:mg-fade_1s_infinite_alternate]",
        className,
      )}
      {...props}
    />
  );
}
