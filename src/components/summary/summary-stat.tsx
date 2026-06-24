export function SummaryStat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="flex-1 rounded-2xl border border-border bg-surface p-[26px] text-center">
      <div className="font-serif text-[44px] font-semibold leading-none text-primary">
        {value}
      </div>
      <div className="mt-2 text-[13px] text-ink-2">{label}</div>
    </div>
  );
}
