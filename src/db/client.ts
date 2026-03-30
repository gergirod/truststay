import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

type DbClient = NodePgDatabase<typeof schema>;

declare global {
  // eslint-disable-next-line no-var
  var __truststayDbPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __truststayDbClient: DbClient | undefined;
}

let warnedMissingDatabaseUrl = false;

function getDatabaseUrl(): string | null {
  const url = process.env.DATABASE_URL ?? null;
  if (!url && !warnedMissingDatabaseUrl) {
    warnedMissingDatabaseUrl = true;
    console.warn("[db] DATABASE_URL is not set; canonical DB is disabled.");
  }
  return url;
}

export function getDb(): DbClient | null {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return null;

  if (!global.__truststayDbPool) {
    global.__truststayDbPool = new Pool({
      connectionString: databaseUrl,
      max: 5,
    });
  }

  if (!global.__truststayDbClient) {
    global.__truststayDbClient = drizzle(global.__truststayDbPool, { schema });
  }

  return global.__truststayDbClient;
}

