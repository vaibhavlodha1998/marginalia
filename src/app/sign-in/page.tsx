import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/ui/logo";
import { SignInForm } from "@/components/auth/sign-in-form";

export default async function SignInPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <div className="flex min-h-screen flex-1 items-stretch">
      <div className="relative flex flex-[1.05] flex-col justify-center bg-surface-2 px-[9vw] pb-12 pt-[104px] max-lg:px-7 max-lg:pt-24">
        <div className="absolute left-[9vw] top-10 max-lg:left-7">
          <Logo />
        </div>
        <div className="max-w-[380px]">
          <h1 className="font-serif text-[40px] font-semibold leading-[1.12] tracking-[-0.02em] text-ink">
            Turn any PDF into a lesson worth finishing.
          </h1>
          <p className="mb-9 mt-4 text-[16px] leading-relaxed text-ink-2">
            Upload a document and Marginalia builds you a guided, quiz-based
            lesson — with a patient tutor alongside you the whole way.
          </p>
          <SignInForm />
        </div>
      </div>

      <aside className="relative flex flex-1 items-center justify-center overflow-hidden bg-primary max-lg:hidden">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 64px), repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 64px)",
          }}
        />
        <div className="relative w-[320px] rotate-[-2deg] rounded-[14px] bg-surface-3 p-[26px] shadow-[0_30px_70px_rgba(0,0,0,0.35)]">
          <div className="mb-3 font-serif text-[13px] text-ink-3">
            OBJECTIVE 2 OF 5
          </div>
          <div className="mb-[18px] font-serif text-[19px] font-semibold leading-[1.3] text-ink">
            Where does the majority of ATP get produced?
          </div>
          <div className="flex flex-col gap-[9px]">
            <div className="rounded-[9px] border border-border px-[13px] py-[11px] text-[13px] text-ink-2">
              Glycolysis
            </div>
            <div className="flex items-center justify-between rounded-[9px] border-[1.5px] border-correct bg-correct-bg px-[13px] py-[11px] text-[13px] font-semibold text-correct-ink">
              The electron transport chain
              <span className="text-correct">✓</span>
            </div>
            <div className="rounded-[9px] border border-border px-[13px] py-[11px] text-[13px] text-ink-2">
              The Krebs cycle
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
