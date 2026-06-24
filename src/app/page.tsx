import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLessons } from "@/app/actions/lessons";
import { signOut } from "@/app/actions/auth";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { LessonCard } from "@/components/library/lesson-card";

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const lessons = await getLessons();
  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-1 flex-col bg-paper">
      <header className="flex items-center justify-between border-b border-border-strong px-11 py-[22px] max-md:px-6">
        <Logo />
        <div className="flex items-center gap-3">
          <form action={signOut}>
            <Button variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
          <div className="flex size-[34px] items-center justify-center rounded-full bg-border-muted text-[13px] font-semibold text-ink-2">
            {initials}
          </div>
        </div>
      </header>

      <div className="mg-scroll flex-1 overflow-y-auto px-11 py-11 max-md:px-6">
        <div className="mx-auto max-w-[980px]">
          <div className="mb-7 flex items-end justify-between gap-4 max-sm:flex-col max-sm:items-start">
            <div>
              <h1 className="font-serif text-[32px] font-semibold tracking-[-0.02em] text-ink">
                Your lessons
              </h1>
              <p className="mt-1.5 text-[15px] text-ink-2">
                Pick up where you left off, or turn a new document into a lesson.
              </p>
            </div>
            <Link href="/new">
              <Button>
                <span className="text-lg leading-none">+</span> New lesson
              </Button>
            </Link>
          </div>

          {lessons.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-2 gap-[18px] max-md:grid-cols-1">
              {lessons.map((lesson) => (
                <LessonCard key={lesson.id} lesson={lesson} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border-[1.5px] border-dashed border-[#d0c4ad] bg-surface-2 px-10 py-[72px] text-center">
      <div className="mx-auto mb-[22px] flex h-[72px] w-[60px] flex-col justify-end gap-[5px] rounded-[6px_10px_10px_6px] border border-border border-l-4 border-l-primary bg-surface p-2.5">
        <div className="h-[3px] rounded-sm bg-[#e0d5c1]" />
        <div className="h-[3px] w-[70%] rounded-sm bg-[#e0d5c1]" />
      </div>
      <h2 className="mb-2 font-serif text-2xl font-semibold text-ink">
        No lessons yet
      </h2>
      <p className="mx-auto mb-[26px] max-w-[380px] text-[15px] leading-relaxed text-ink-2">
        Upload a PDF — a chapter, a paper, a set of notes — and Marginalia will
        shape it into a guided lesson you can work through at your own pace.
      </p>
      <Link href="/new">
        <Button>Upload your first PDF</Button>
      </Link>
    </div>
  );
}
