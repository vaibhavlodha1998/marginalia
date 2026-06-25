"use client";

import Link from "next/link";
import {
  CircleHelp,
  ClipboardList,
  FileText,
  ChartColumn,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ProgressBar } from "@/components/ui/progress-bar";
import { RichText } from "@/components/ui/rich-text";
import { RailTabButton } from "./rail-tab-button";
import type { WorkspaceLesson, WorkspaceTab } from "./types";

const TABS: { id: WorkspaceTab; label: string; icon: LucideIcon }[] = [
  { id: "quiz", label: "Quiz", icon: CircleHelp },
  { id: "plan", label: "Lesson plan", icon: ClipboardList },
  { id: "source", label: "Source PDF", icon: FileText },
  { id: "progress", label: "Progress", icon: ChartColumn },
];

export function LessonRail({
  lesson,
  active,
  onTab,
  correct,
  total,
}: {
  lesson: WorkspaceLesson;
  active: WorkspaceTab;
  onTab: (tab: WorkspaceTab) => void;
  correct: number;
  total: number;
}) {
  const pct = total ? Math.round((correct / total) * 100) : 0;

  return (
    <aside className="flex w-[250px] flex-none flex-col border-r border-border-strong bg-surface-2 p-4 max-md:w-full max-md:flex-row max-md:items-center max-md:gap-3 max-md:border-b max-md:border-r-0 max-md:p-3">
      <div className="px-2 pb-[18px] pt-1 max-md:p-0">
        <Logo size="sm" />
      </div>

      <div className="rounded-[12px] border border-border bg-surface p-3.5 max-md:hidden">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-3">
          Current lesson
        </div>
        <RichText
          inline
          className="mb-1 block font-serif text-[17px] font-semibold leading-[1.25] tracking-[-0.01em] text-ink"
        >
          {lesson.title}
        </RichText>
        <div className="truncate font-mono text-[11.5px] text-ink-3">
          {lesson.sourceFilename ?? "Source PDF"}
        </div>
      </div>

      <nav className="mt-[18px] flex flex-col gap-[3px] max-md:mt-0 max-md:flex-row">
        {TABS.map((t) => (
          <RailTabButton
            key={t.id}
            label={t.label}
            icon={t.icon}
            active={active === t.id}
            onClick={() => onTab(t.id)}
          />
        ))}
      </nav>

      <div className="mt-auto px-3 pb-1.5 pt-3.5 max-md:hidden">
        <div className="mb-2 flex justify-between text-[12px] text-ink-2">
          <span>Lesson progress</span>
          <span className="font-semibold text-primary">
            {correct}/{total}
          </span>
        </div>
        <ProgressBar value={pct} />
        <Link
          href="/"
          className="mt-3 inline-block text-[12.5px] text-ink-3 hover:text-ink-2"
        >
          ← Exit to library
        </Link>
      </div>
    </aside>
  );
}
