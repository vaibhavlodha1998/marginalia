import { Skeleton } from "@/components/ui/skeleton";
import { ThinkingDots } from "@/components/ui/thinking-dots";

export function PlanThinking({ failed }: { failed?: boolean }) {
  if (failed) {
    return (
      <div>
        <h1 className="mb-2.5 font-serif text-[30px] font-semibold tracking-[-0.02em] text-ink">
          Couldn&apos;t draft a plan
        </h1>
        <p className="text-[15px] leading-relaxed text-ink-2">
          Something went wrong generating the lesson plan. Refresh to try again.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2.5 font-serif text-[30px] font-semibold tracking-[-0.02em] text-ink">
        Drafting your lesson plan
      </h1>
      <p className="mb-7 flex items-center gap-2 text-[15px] leading-relaxed text-ink-2">
        Working out the right learning objectives
        <ThinkingDots />
      </p>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-[74px]" />
        <Skeleton className="h-[74px]" />
        <Skeleton className="h-[74px]" />
      </div>
    </div>
  );
}
