"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteLesson } from "@/app/actions/lessons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeleteLessonButton({
  lessonId,
  title,
}: {
  lessonId: string;
  title: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function confirm() {
    start(async () => {
      await deleteLesson(lessonId);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Delete lesson"
        className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-lg text-ink-3 opacity-0 transition hover:bg-hard/10 hover:text-hard group-hover:opacity-100"
      >
        <Trash2 className="size-4" />
      </button>
      <ConfirmDialog
        open={open}
        title="Delete lesson"
        message={`Delete “${title}”? This permanently removes the lesson, its plan, and questions.`}
        confirmLabel="Delete"
        destructive
        pending={pending}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
