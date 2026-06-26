"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useQuizStore } from "@/lib/store/quiz-store";
import { getChatMessages } from "@/app/actions/chat";
import { RichText } from "@/components/ui/rich-text";
import { ThinkingDots } from "@/components/ui/thinking-dots";
import { QuizFigure } from "@/components/quiz/quiz-figure";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTED = ["Hint, please", "Explain simply"];

export function TutorChat({
  lessonId,
  open,
  onToggle,
}: {
  lessonId: string;
  open: boolean;
  onToggle: () => void;
}) {
  const active = useQuizStore((s) => s.active);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fresh thread per question (render-time reset, not an effect).
  const [threadId, setThreadId] = useState(active?.mcqId);
  if (active?.mcqId !== threadId) {
    setThreadId(active?.mcqId);
    setMessages([]);
  }

  // Saved thread: per-question for the MCQ tutor, or the document thread (null).
  useEffect(() => {
    let cancelled = false;
    getChatMessages(lessonId, active?.mcqId ?? null)
      .then((turns) => {
        if (!cancelled && turns.length) setMessages(turns);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [active?.mcqId, lessonId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const history = [...messages, { role: "user" as const, content: trimmed }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setPending(true);
    try {
      // A question in scope uses the no-spoiler MCQ tutor; otherwise the document Q&A.
      const res = await fetch(
        active ? `/api/lessons/${lessonId}/chat` : `/api/lessons/${lessonId}/doc-chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            active ? { messages: history, mcqId: active.mcqId } : { messages: history },
          ),
        },
      );
      if (!res.body) throw new Error("no stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Sorry, I couldn't respond just now — try again.",
        };
        return copy;
      });
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="absolute bottom-6 right-6 flex items-center gap-2 rounded-[26px] bg-primary px-5 py-3 text-[14px] font-semibold text-on-primary shadow-[0_10px_26px_rgba(44,39,34,0.22)]"
      >
        <MessageCircle className="size-4" />
        Ask your tutor
      </button>
    );
  }

  const waiting =
    pending && messages.length > 0 && messages[messages.length - 1].content === "";

  return (
    <aside className="flex w-[340px] flex-none flex-col border-l border-border-strong bg-surface-2 max-lg:w-[300px] max-md:fixed max-md:inset-0 max-md:z-40 max-md:w-full">
      <div className="flex items-center justify-between border-b border-border-strong px-[18px] pb-3.5 pt-[18px]">
        <div className="flex items-center gap-2.5">
          <div className="flex size-[30px] items-center justify-center rounded-[9px] bg-primary font-serif text-[14px] font-semibold text-on-primary">
            T
          </div>
          <div>
            <div className="text-[14px] font-semibold text-ink">Your tutor</div>
            <div className="flex items-center gap-1.5 text-[11.5px] text-easy">
              <span className="size-1.5 rounded-full bg-easy" />
              Here to help
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          title="Collapse"
          className="px-2 py-1 text-[18px] leading-none text-ink-3 hover:text-ink-2"
        >
          ›
        </button>
      </div>

      <div
        ref={scrollRef}
        className="mg-scroll flex flex-1 flex-col gap-3.5 overflow-y-auto p-[18px]"
      >
        {active?.figureUrl && active.figurePlacement === "question" && (
          <QuizFigure url={active.figureUrl} />
        )}

        <div className="max-w-[86%] self-start rounded-[14px_14px_14px_4px] border border-border bg-surface px-3.5 py-[11px] text-[13.5px] leading-[1.55] text-ink">
          {active
            ? "Ask me for a hint or to explain anything about this question, and I'll never give the answer away."
            : "Ask me anything about this document and I'll explain it, grounded in what it says."}
        </div>

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div
              key={i}
              className="max-w-[86%] self-end rounded-[14px_14px_4px_14px] bg-primary px-3.5 py-[11px] text-[13.5px] leading-[1.55] text-on-primary"
            >
              {m.content}
            </div>
          ) : (
            m.content && (
              <RichText
                key={i}
                className="max-w-[86%] self-start rounded-[14px_14px_14px_4px] border border-border bg-surface px-3.5 py-[11px] text-[13.5px] leading-[1.55] text-ink"
              >
                {m.content}
              </RichText>
            )
          ),
        )}

        {waiting && (
          <div className="self-start rounded-[14px_14px_14px_4px] border border-border bg-surface px-3.5 py-3">
            <ThinkingDots dotClassName="!bg-ink-3" />
          </div>
        )}
      </div>

      <div className="border-t border-border-strong px-4 pb-4 pt-3">
        {active && (
          <div className="mb-2.5 flex gap-2">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                type="button"
                disabled={pending}
                onClick={() => send(s)}
                className="rounded-2xl border border-[#d7dcec] bg-[#eceef6] px-3 py-1.5 text-[12px] text-primary disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-[12px] border border-border bg-surface py-2 pl-3 pr-2">
          <input
            value={input}
            disabled={pending}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send(input);
            }}
            placeholder={
              active ? "Ask for a hint or an explanation…" : "Ask about this document…"
            }
            className="flex-1 bg-transparent py-1 text-[13.5px] text-ink outline-none placeholder:text-ink-3 disabled:opacity-60"
          />
          <button
            type="button"
            disabled={pending || !input.trim()}
            onClick={() => send(input)}
            className="flex size-8 flex-none items-center justify-center rounded-lg bg-primary text-[14px] font-semibold text-on-primary disabled:opacity-50"
          >
            ↑
          </button>
        </div>
        <p className="mt-2 text-center text-[10.5px] text-ink-4">
          {active
            ? "Your tutor gives hints and explanations, never the answer."
            : "Answers come from your document."}
        </p>
      </div>
    </aside>
  );
}
