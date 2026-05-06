import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required. Please configure Neon Postgres connection string.');
  }

  const sql = postgres(connectionString, { prepare: false });
  dbInstance = drizzle(sql, { schema });
  return dbInstance;
}
