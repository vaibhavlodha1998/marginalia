import { cn } from "@/lib/utils/cn";

export function Logo({
  size = "md",
  showWordmark = true,
  className,
}: {
  size?: "sm" | "md";
  showWordmark?: boolean;
  className?: string;
}) {
  const tile = size === "sm" ? "size-6 text-[15px]" : "size-[26px] text-[17px]";
  const word = size === "sm" ? "text-[17px]" : "text-[19px]";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-[7px] bg-primary font-serif font-semibold text-on-primary",
          tile,
        )}
      >
        M
      </div>
      {showWordmark && (
        <span
          className={cn(
            "font-serif font-semibold tracking-[-0.01em] text-ink",
            word,
          )}
        >
          Marginalia
        </span>
      )}
    </div>
  );
}
