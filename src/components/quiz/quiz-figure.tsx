export function QuizFigure({ url, className }: { url: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="Figure for this question"
      className={`max-h-[340px] w-full rounded-[12px] border border-border bg-white object-contain p-2 ${className ?? ""}`}
      style={{ mixBlendMode: "multiply" }}
    />
  );
}
