"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approvePlan } from "@/app/actions/plan";
import { Button } from "@/components/ui/button";
import { PlanObjectiveRow } from "./plan-objective-row";
import type { Difficulty, Objective } from "@/types/lesson";

const NEXT_DIFFICULTY: Record<Difficulty, Difficulty> = {
  easy: "medium",
  medium: "hard",
  hard: "easy",
};

interface Row {
  id: string;
  title: string;
  section: string;
  difficulty: Difficulty;
  included: boolean;
  questionCount: number;
}

export function PlanReview({
  lessonId,
  objectives,
}: {
  lessonId: string;
  objectives: Objective[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<Row[]>(
    objectives.map((o) => ({
      id: o.id,
      title: o.title,
      section: o.section ?? "Objectives",
      difficulty: o.difficulty,
      included: o.included,
      questionCount: o.plannedMcqCount ?? 3,
    })),
  );

  const includedCount = rows.filter((r) => r.included).length;

  const sections: { title: string; rows: Row[] }[] = [];
  for (const r of rows) {
    const group = sections.find((s) => s.title === r.section);
    if (group) group.rows.push(r);
    else sections.push({ title: r.section, rows: [r] });
  }

  function toggle(id: string) {
    setRows((rs) =>
      rs.map((r) => (r.id === id ? { ...r, included: !r.included } : r)),
    );
  }

  function cycle(id: string) {
    setRows((rs) =>
      rs.map((r) =>
        r.id === id ? { ...r, difficulty: NEXT_DIFFICULTY[r.difficulty] } : r,
      ),
    );
  }

  function confirm() {
    startTransition(async () => {
      await approvePlan(
        lessonId,
        rows.map((r) => ({ id: r.id, difficulty: r.difficulty, included: r.included })),
      );
      router.push(`/lessons/${lessonId}`);
      router.refresh();
    });
  }

  return (
    <div>
      <h1 className="mb-2.5 font-serif text-[30px] font-semibold tracking-[-0.02em] text-ink">
        Here&apos;s the lesson I&apos;d suggest
      </h1>
      <p className="mb-2 text-[15px] leading-relaxed text-ink-2">
        Objectives drawn from your document, ordered easiest to hardest. Tweak the
        difficulty, drop anything you already know — then confirm to begin.{" "}
        <strong className="font-semibold text-ink">
          Nothing starts until you sign off.
        </strong>
      </p>
      <div className="mb-6 flex items-center gap-4 text-[12px] text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-[9px] rounded-[3px] bg-easy" />
          Easy
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-[9px] rounded-[3px] bg-medium" />
          Medium
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-[9px] rounded-[3px] bg-hard" />
          Hard
        </span>
        <span className="ml-auto italic">Tap a difficulty pill to change it</span>
      </div>

      <div className="flex flex-col gap-7">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="mb-3 font-serif text-[15px] font-semibold uppercase tracking-[0.04em] text-ink-3">
              {section.title}
            </h2>
            <div className="flex flex-col gap-3">
              {section.rows.map((r) => (
                <PlanObjectiveRow
                  key={r.id}
                  title={r.title}
                  difficulty={r.difficulty}
                  questionCount={r.questionCount}
                  included={r.included}
                  onToggle={() => toggle(r.id)}
                  onCycleDifficulty={() => cycle(r.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-7 flex items-center justify-between gap-4 rounded-[14px] border border-border bg-surface-3 px-[22px] py-5">
        <div className="text-[14px] text-ink-2">
          <strong className="font-semibold text-ink">
            {includedCount} objective{includedCount === 1 ? "" : "s"}
          </strong>{" "}
          selected for this lesson
        </div>
        <Button onClick={confirm} disabled={pending || includedCount === 0}>
          {pending ? "Starting…" : "Confirm & start lesson →"}
        </Button>
      </div>
    </div>
  );
}
