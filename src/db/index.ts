import * as schema from "./schema";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePGlite } from "drizzle-orm/pglite";
import * as fs from "fs";
import * as path from "path";

export type CakeCartDb = ReturnType<typeof drizzleNeon<typeof schema>> | ReturnType<typeof drizzlePGlite<typeof schema>> | ReturnType<typeof drizzlePg<typeof schema>>;

let globalDb: CakeCartDb | null = null;
let pgliteInstance: PGlite | null = null;

export async function getDb(): Promise<CakeCartDb> {
  if (globalDb) {
    return globalDb;
  }

  const databaseUrl = process.env.DATABASE_URL;

  // 1. Neon serverless / Remote Postgres
  if (databaseUrl && (databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://"))) {
    // If it's a Neon URL, Neon serverless pooler is ideal
    if (databaseUrl.includes("neon.tech")) {
      const pool = new NeonPool({ connectionString: databaseUrl });
      globalDb = drizzleNeon(pool, { schema });
      return globalDb;
    } else {
      // Standard Node.js PG pool
      const pool = new PgPool({ connectionString: databaseUrl });
      globalDb = drizzlePg(pool, { schema });
      return globalDb;
    }
  }

  // 2. Embedded PostgreSQL (PGlite) for local development and automated testing
  // Allows running full Postgres SQL, check constraints, types, and transactions with zero external services required!
  const localDbDir = path.join(process.cwd(), ".cakecart_db");
  if (!fs.existsSync(localDbDir)) {
    fs.mkdirSync(localDbDir, { recursive: true });
  }

  pgliteInstance = new PGlite(localDbDir);
  globalDb = drizzlePGlite(pgliteInstance, { schema });
  
  // Ensure tables and constraints exist on initialization
  await initializeLocalDb(pgliteInstance);

  return globalDb;
}

// Function to initialize local PGlite with schema from migration
async function initializeLocalDb(pglite: PGlite) {
  try {
    const migrationPath = path.join(process.cwd(), "drizzle", "0000_sad_nekra.sql");
    if (fs.existsSync(migrationPath)) {
      const migrationSql = fs.readFileSync(migrationPath, "utf-8");
      // Split on statement-breakpoint
      const statements = migrationSql
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        try {
          await pglite.query(statement);
        } catch (err: unknown) {
          // Ignore if already exists (e.g. types or tables)
          const errorMsg = err instanceof Error ? err.message : String(err);
          if (
            !errorMsg.includes("already exists") &&
            !errorMsg.includes("duplicate")
          ) {
            console.warn("Migration notice:", errorMsg);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error initializing local database schema:", error);
  }
}

// Synchronous wrapper proxy for convenience where async getDb() isn't ideal
export { schema };
