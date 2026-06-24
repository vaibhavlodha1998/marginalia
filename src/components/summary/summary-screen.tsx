"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { generateSummary, type SummaryResult } from "@/app/actions/summary";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/ui/rich-text";
import { ThinkingDots } from "@/components/ui/thinking-dots";
import { SummaryStat } from "./summary-stat";
import type { ProgressMap, WorkspaceObjective } from "@/components/workspace/types";

export function SummaryScreen({
  lessonId,
  lessonTitle,
  objectives,
  progress,
}: {
  lessonId: string;
  lessonTitle: string;
  objectives: WorkspaceObjective[];
  progress: ProgressMap;
}) {
  const started = useRef(false);
  const [data, setData] = useState<SummaryResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    generateSummary(lessonId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lessonId]);

  const perObjective = objectives.map((o) => {
    const p = progress[o.id];
    return {
      title: o.title,
      correct: p?.correct ?? 0,
      total: o.plannedMcqCount ?? p?.total ?? 0,
    };
  });
  const correct = perObjective.reduce((s, o) => s + o.correct, 0);
  const total = perObjective.reduce((s, o) => s + o.total, 0);
  const pct = total ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-[720px] px-10 py-14 max-md:px-6">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-[18px] bg-primary text-[30px] text-on-primary">
          ✦
        </div>
        <div className="mb-3 text-[12.5px] font-semibold uppercase tracking-[0.06em] text-ink-3">
          Lesson complete
        </div>
        <h1 className="mb-2.5 font-serif text-[34px] font-semibold tracking-[-0.02em] text-ink">
          Nicely done — you finished {lessonTitle}.
        </h1>
        <p className="text-[16px] leading-relaxed text-ink-2">
          You worked through every objective. Here&apos;s how it went, and a few
          things to revisit.
        </p>
      </div>

      <div className="mb-9 flex gap-3.5 max-sm:flex-col">
        <SummaryStat value={`${pct}%`} label="Overall score" />
        <SummaryStat value={`${correct}`} label={`of ${total} questions correct`} />
        <SummaryStat value={`${objectives.length}`} label="objectives explored" />
      </div>

      <h3 className="mb-3.5 font-serif text-[19px] font-semibold text-ink">
        Objective by objective
      </h3>
      <div className="mb-9 flex flex-col gap-3">
        {perObjective.map((o, i) => {
          const oPct = o.total ? Math.round((o.correct / o.total) * 100) : 0;
          const bar = o.total && o.correct === o.total ? "bg-easy" : "bg-primary";
          return (
            <div
              key={i}
              className="rounded-[12px] border border-border bg-surface px-[18px] py-4"
            >
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <RichText
                  inline
                  className="font-serif text-[16px] font-semibold text-ink"
                >
                  {o.title}
                </RichText>
                <span className="text-[13px] font-semibold text-ink-2">
                  {o.correct}/{o.total}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-paper">
                <div className={`h-full rounded-full ${bar}`} style={{ width: `${oPct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-8 rounded-2xl bg-primary p-7 text-on-primary">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex size-[30px] items-center justify-center rounded-[9px] bg-white/15 font-serif font-semibold">
            T
          </div>
          <span className="font-serif text-[18px] font-semibold">
            A note from your tutor
          </span>
        </div>
        {loading ? (
          <ThinkingDots dotClassName="!bg-white/70" />
        ) : (
          <>
            <RichText className="text-[15px] leading-[1.7] text-[#e6e2ee]">
              {data?.note ?? "Great work finishing the lesson."}
            </RichText>
            {data?.tips?.length ? (
              <div className="mt-4 flex flex-col gap-2.5">
                {data.tips.map((tip, i) => (
                  <div key={i} className="flex gap-2.5 text-[14px] leading-[1.55] text-[#e6e2ee]">
                    <span className="text-[#b9c1de]">→</span>
                    <RichText inline>{tip}</RichText>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="flex justify-center gap-3">
        <Link href="/">
          <Button variant="secondary">Back to library</Button>
        </Link>
        <Link href="/new">
          <Button>Start a new lesson</Button>
        </Link>
      </div>
    </div>
  );
}
