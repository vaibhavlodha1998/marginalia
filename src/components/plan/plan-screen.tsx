import { PlanReview } from "./plan-review";
import { PlanStream } from "./plan-stream";
import type { Objective } from "@/types/lesson";

export function PlanScreen({
  lessonId,
  objectives,
}: {
  lessonId: string;
  objectives: Objective[];
}) {
  if (objectives.length) {
    return <PlanReview lessonId={lessonId} objectives={objectives} />;
  }
  return <PlanStream lessonId={lessonId} />;
}
