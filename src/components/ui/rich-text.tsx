import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils/cn";

export function RichText({
  children,
  className,
  inline = false,
}: {
  children: string | null | undefined;
  className?: string;
  inline?: boolean;
}) {
  const content = children ?? "";
  if (inline) {
    return (
      <span className={cn("mg-rich", className)}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{ p: ({ children }) => <>{children}</> }}
        >
          {content}
        </ReactMarkdown>
      </span>
    );
  }
  return (
    <div className={cn("mg-rich", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
