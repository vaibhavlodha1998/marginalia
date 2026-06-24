"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { generatePlan } from "@/app/actions/plan";
import { PlanThinking } from "./plan-thinking";
import { PlanReview } from "./plan-review";
import type { Objective } from "@/types/lesson";

export function PlanScreen({
  lessonId,
  objectives,
}: {
  lessonId: string;
  objectives: Objective[];
}) {
  const router = useRouter();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (objectives.length || started.current) return;
    started.current = true;
    generatePlan(lessonId)
      .then((r) => (r.count > 0 ? router.refresh() : setFailed(true)))
      .catch(() => setFailed(true));
  }, [lessonId, objectives.length, router]);

  if (objectives.length) {
    return <PlanReview lessonId={lessonId} objectives={objectives} />;
  }

  return <PlanThinking failed={failed} />;
}
