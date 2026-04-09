import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST || "postgres",
      port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
      database: process.env.POSTGRES_DB || "streaming",
      user: process.env.POSTGRES_USER || "streaming",
      password: process.env.POSTGRES_PASSWORD || "streaming",
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const client = getPool();
  const result = await client.query(text, params);
  return result.rows as T[];
}

export async function checkHealth(): Promise<boolean> {
  try {
    const client = getPool();
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
