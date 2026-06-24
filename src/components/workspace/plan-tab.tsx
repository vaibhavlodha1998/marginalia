import { DifficultyPill } from "@/components/ui/difficulty-pill";
import { RichText } from "@/components/ui/rich-text";
import type { WorkspaceObjective } from "./types";

const MARK: Record<WorkspaceObjective["status"], string> = {
  done: "✓",
  current: "→",
  upcoming: "",
};

export function PlanTab({ objectives }: { objectives: WorkspaceObjective[] }) {
  const sections: { title: string; items: WorkspaceObjective[] }[] = [];
  for (const o of objectives) {
    const key = o.section ?? "Objectives";
    const group = sections.find((s) => s.title === key);
    if (group) group.items.push(o);
    else sections.push({ title: key, items: [o] });
  }

  return (
    <div className="mx-auto max-w-[680px] p-10 max-md:p-6">
      <h2 className="mb-1.5 font-serif text-[26px] font-semibold tracking-[-0.02em] text-ink">
        Lesson plan
      </h2>
      <p className="mb-7 text-[14.5px] text-ink-2">
        Your objectives for this lesson, and where you are right now.
      </p>

      <div className="flex flex-col gap-7">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="mb-3 font-serif text-[14px] font-semibold uppercase tracking-[0.04em] text-ink-3">
              {section.title}
            </h3>
            <div className="flex flex-col gap-3">
              {section.items.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center gap-4 rounded-[12px] border border-border bg-surface px-[18px] py-4"
                >
                  <div
                    className={`flex size-[34px] flex-none items-center justify-center rounded-full border-[1.5px] font-serif text-[13px] font-semibold ${
                      o.status === "done"
                        ? "border-easy bg-easy/10 text-easy"
                        : o.status === "current"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border-muted text-ink-3"
                    }`}
                  >
                    {MARK[o.status]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <RichText
                      inline
                      className="font-serif text-[17px] font-semibold tracking-[-0.01em] text-ink"
                    >
                      {o.title}
                    </RichText>
                    <div className="mt-0.5 text-[12.5px] capitalize text-ink-3">
                      {o.status === "current" ? "In progress" : o.status}
                    </div>
                  </div>
                  <DifficultyPill difficulty={o.difficulty} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
