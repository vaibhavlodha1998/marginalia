import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <Card className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Marginalia</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Turn any PDF into an interactive, quiz-based lesson.
        </p>
        <Button className="mt-6" disabled>
          Coming soon
        </Button>
      </Card>
    </main>
  );
}
