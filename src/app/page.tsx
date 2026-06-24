import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 items-center justify-center bg-paper p-8">
      <Card className="max-w-md text-center">
        <Logo className="justify-center" />
        <h1 className="mt-6 font-serif text-[26px] font-semibold tracking-[-0.02em] text-ink">
          You&apos;re signed in.
        </h1>
        <p className="mt-2 text-[14.5px] text-ink-2">
          {user?.email}
        </p>
        <p className="mt-4 text-[13.5px] text-ink-3">
          Your lesson library is coming next.
        </p>
        <form action={signOut} className="mt-7">
          <Button type="submit" variant="secondary" className="w-full">
            Sign out
          </Button>
        </form>
      </Card>
    </main>
  );
}
