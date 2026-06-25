"use client";

import { useEffect, useRef, useState } from "react";
import { generatePlan } from "@/app/actions/plan";
import { PlanThinking } from "./plan-thinking";

// Draft the plan via a single server action, then hard-reload so the persisted
// objectives render reliably (router.refresh can stall under dev Turbopack).
export function PlanStream({ lessonId }: { lessonId: string }) {
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    generatePlan(lessonId)
      .then((r) => {
        if (r.count > 0) window.location.reload();
        else setFailed(true);
      })
      .catch(() => setFailed(true));
  }, [lessonId]);

  return <PlanThinking failed={failed} />;
}
