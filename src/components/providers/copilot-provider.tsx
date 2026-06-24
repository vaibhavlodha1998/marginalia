"use client";

import type { ReactNode } from "react";
import { CopilotKit } from "@copilotkit/react-core";

export function CopilotProvider({ children }: { children: ReactNode }) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">{children}</CopilotKit>
  );
}
