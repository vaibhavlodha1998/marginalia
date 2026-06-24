import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UploadDropzone } from "@/components/upload/upload-dropzone";

export default async function NewLessonPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="flex flex-1 flex-col bg-paper">
      <header className="flex items-center gap-3.5 border-b border-border-strong px-11 py-[22px] max-md:px-6">
        <Link href="/" className="text-[13.5px] text-ink-2 hover:text-ink">
          ← Library
        </Link>
        <span className="text-border-muted">/</span>
        <span className="font-serif text-[16px] font-semibold text-ink">
          New lesson
        </span>
      </header>
      <div className="mg-scroll flex flex-1 items-center justify-center overflow-y-auto p-10">
        <UploadDropzone userId={user.id} />
      </div>
    </div>
  );
}
