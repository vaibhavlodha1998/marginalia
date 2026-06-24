import { Pool } from "pg";
import { serverEnv } from "@/lib/config/env";

// Single pooled connection reused across serverless invocations.
declare global {
   
  var __pgPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!global.__pgPool) {
    global.__pgPool = new Pool({
      connectionString: serverEnv().DATABASE_URL,
      max: 5,
    });
  }
  return global.__pgPool;
}
