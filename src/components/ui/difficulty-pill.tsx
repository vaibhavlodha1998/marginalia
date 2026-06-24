import { cn } from "@/lib/utils/cn";

export type Difficulty = "easy" | "medium" | "hard";

const styles: Record<Difficulty, string> = {
  easy: "text-easy bg-easy/10 border-easy/30",
  medium: "text-medium bg-medium/10 border-medium/30",
  hard: "text-hard bg-hard/10 border-hard/30",
};

export function DifficultyPill({
  difficulty,
  className,
  ...props
}: { difficulty: Difficulty } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11.5px] font-semibold capitalize",
        styles[difficulty],
        className,
      )}
      {...props}
    >
      {difficulty}
    </span>
  );
}
