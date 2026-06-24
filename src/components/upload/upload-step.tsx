export function UploadStep({
  label,
  done,
  active,
}: {
  label: string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 ${done || active ? "text-ink" : "text-ink-3"}`}
    >
      {done ? (
        <span className="text-easy">✓</span>
      ) : active ? (
        <span className="inline-flex gap-[3px]">
          <span className="size-[5px] rounded-full bg-primary [animation:mg-blink_1.2s_infinite]" />
          <span className="size-[5px] rounded-full bg-primary [animation:mg-blink_1.2s_infinite_.2s]" />
          <span className="size-[5px] rounded-full bg-primary [animation:mg-blink_1.2s_infinite_.4s]" />
        </span>
      ) : (
        <span className="size-[5px] rounded-full bg-border-muted" />
      )}
      {label}
    </div>
  );
}
