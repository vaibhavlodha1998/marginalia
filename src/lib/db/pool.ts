import { Pool } from "pg";
import { serverEnv } from "@/lib/config/env";

// Single pooled connection reused across serverless invocations.
declare global {
   
  var __pgPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!global.__pgPool) {
    const url = serverEnv().DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    global.__pgPool = new Pool({
      connectionString: url,
      max: 5,
    });
  }
  return global.__pgPool;
}
