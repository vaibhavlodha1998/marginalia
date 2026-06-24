import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-paper p-8">
      <Card className="max-w-md text-center">
        <Logo className="justify-center" />
        <h1 className="mt-6 font-serif text-[30px] font-semibold tracking-[-0.02em] text-ink">
          Turn any PDF into a lesson worth finishing.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Upload a document and Marginalia builds a guided, quiz-based lesson —
          with a patient tutor alongside you the whole way.
        </p>
        <Button className="mt-7 w-full" disabled>
          Coming soon
        </Button>
      </Card>
    </main>
  );
}
