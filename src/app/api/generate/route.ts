import { createClient } from "@/lib/supabase/server";
import { generateObjectiveMcqs } from "@/app/actions/quiz";

// A plain request, so generation stays off Next's single server-action queue.
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { objectiveId } = (await req.json()) as { objectiveId?: string };
  if (!objectiveId) return new Response("Bad request", { status: 400 });

  try {
    return Response.json(await generateObjectiveMcqs(objectiveId));
  } catch {
    return Response.json({ count: 0 });
  }
}
