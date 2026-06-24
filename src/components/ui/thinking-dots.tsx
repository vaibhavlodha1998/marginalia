import { cn } from "@/lib/utils/cn";

export function ThinkingDots({
  className,
  dotClassName,
}: {
  className?: string;
  dotClassName?: string;
}) {
  return (
    <span className={cn("inline-flex gap-1", className)} aria-label="Thinking">
      {[0, 0.2, 0.4].map((delay) => (
        <span
          key={delay}
          className={cn(
            "size-1.5 rounded-full bg-primary [animation:mg-blink_1.2s_infinite]",
            dotClassName,
          )}
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </span>
  );
}
