"use client";

import type { ReactNode } from "react";
import { QueryProvider } from "./query-provider";

// CopilotProvider is mounted once the Deep Agents graph is wired (see
// ./copilot-provider and src/app/api/copilotkit/route.ts).
export function Providers({ children }: { children: ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
