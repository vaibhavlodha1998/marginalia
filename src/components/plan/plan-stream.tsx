"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { planSchema } from "@/lib/schemas/plan";
import { savePlan, generatePlan } from "@/app/actions/plan";
import { DifficultyPill } from "@/components/ui/difficulty-pill";
import { PlanThinking } from "./plan-thinking";

export function PlanStream({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const started = useRef(false);

  const { object, submit, error } = useObject({
    api: `/api/lessons/${lessonId}/plan`,
    schema: planSchema,
    onFinish: async ({ object: final }) => {
      try {
        if (final) await savePlan(lessonId, final);
        else await generatePlan(lessonId);
      } catch {
        await generatePlan(lessonId).catch(() => {});
      }
      router.refresh();
    },
    onError: async () => {
      await generatePlan(lessonId).catch(() => {});
      router.refresh();
    },
  });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    submit({});
  }, [submit]);

  const sections = object?.sections ?? [];

  if (error) return <PlanThinking failed />;
  if (!sections.length) return <PlanThinking />;

  return (
    <div>
      <h1 className="mb-2 font-serif text-[30px] font-semibold tracking-[-0.02em] text-ink">
        Drafting your lesson plan…
      </h1>
      <p className="mb-7 text-[15px] text-ink-2">
        Objectives appear as they&apos;re written.
      </p>
      <div className="flex flex-col gap-7">
        {sections.map((section, i) => (
          <div key={i}>
            <h2 className="mb-3 font-serif text-[15px] font-semibold uppercase tracking-[0.04em] text-ink-3">
              {section?.title ?? "…"}
            </h2>
            <div className="flex flex-col gap-3">
              {(section?.objectives ?? []).map((o, j) => (
                <div
                  key={j}
                  className="flex items-center gap-4 rounded-[12px] border border-border bg-surface px-[18px] py-4 [animation:mg-fade-up_.3s_ease]"
                >
                  <div className="min-w-0 flex-1 font-serif text-[17px] font-semibold tracking-[-0.01em] text-ink">
                    {o?.title ?? "…"}
                  </div>
                  {o?.difficulty && <DifficultyPill difficulty={o.difficulty} />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
