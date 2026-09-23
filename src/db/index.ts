import * as schema from "./schema";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import { INITIAL_MIGRATION_SQL } from "./initialMigrationSql";
import * as path from "path";
import * as fs from "fs";

export type CakeCartDb = ReturnType<typeof drizzleNeon<typeof schema>> | ReturnType<typeof drizzlePg<typeof schema>> | any;

let globalDb: CakeCartDb | null = null;
let initialized = false;
let initPromise: Promise<CakeCartDb> | null = null;

export async function getDb(): Promise<CakeCartDb> {
  if (globalDb && initialized) {
    return globalDb;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const databaseUrl = process.env.DATABASE_URL;

    // 1. Neon serverless / Remote Postgres (Railway, Neon, etc.)
    if (databaseUrl && (databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://"))) {
      let pool: PgPool | NeonPool;

      if (databaseUrl.includes("neon.tech")) {
        pool = new NeonPool({ connectionString: databaseUrl });
        globalDb = drizzleNeon(pool, { schema });
      } else {
        const pgPool = new PgPool({
          connectionString: databaseUrl,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });
        globalDb = drizzlePg(pgPool, { schema });
        pool = pgPool;
      }

      initialized = true;

      // Auto-migrate schema on remote Postgres if needed
      await autoMigratePg(pool);
      return globalDb;
    }

    // 2. Embedded PostgreSQL (PGlite) for local development and offline testing
    try {
      const { PGlite } = await import("@electric-sql/pglite");
      const { drizzle: drizzlePGlite } = await import("drizzle-orm/pglite");

      const localDbDir = path.join(process.cwd(), ".cakecart_db");
      if (!fs.existsSync(localDbDir)) {
        fs.mkdirSync(localDbDir, { recursive: true });
      }

      const pgliteInstance = new PGlite(localDbDir);
      globalDb = drizzlePGlite(pgliteInstance, { schema });
      initialized = true;
      await initializeLocalDb(pgliteInstance);
      return globalDb;
    } catch (err) {
      console.error("PGlite initialization error:", err);
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

// Function to auto-apply migrations on Postgres (Railway / Docker / Neon)
async function autoMigratePg(pool: any) {
  try {
    const statements = INITIAL_MIGRATION_SQL
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const client = await pool.connect();
    try {
      for (const statement of statements) {
        try {
          await client.query(statement);
        } catch (err: any) {
          if (!err.message?.includes("already exists") && !err.message?.includes("duplicate")) {
            console.warn("Migration notice:", err.message);
          }
        }
      }

      // Check if products exist, if not, auto-seed
      const res = await client.query('SELECT count(*) FROM "products"');
      const count = parseInt(res.rows[0]?.count || "0", 10);
      if (count === 0) {
        console.log("Database empty. Auto-seeding initial artisan cakes and slots...");
        const { runSeed } = await import("./seed");
        await runSeed();
      }
    } finally {
      try {
        client.release();
      } catch {}
    }
  } catch (error) {
    console.error("Error auto-migrating remote Postgres database:", error);
  }
}

// Function to initialize local PGlite with schema
async function initializeLocalDb(pglite: any) {
  try {
    const statements = INITIAL_MIGRATION_SQL
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      try {
        await pglite.query(statement);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (
          !errorMsg.includes("already exists") &&
          !errorMsg.includes("duplicate")
        ) {
          console.warn("Migration notice:", errorMsg);
        }
      }
    }
  } catch (error) {
    console.error("Error initializing local database schema:", error);
  }
}

export { schema };
