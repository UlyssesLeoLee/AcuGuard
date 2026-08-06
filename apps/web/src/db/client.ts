import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let db: ReturnType<typeof drizzle> | null = null;

export function hasDatabase(): boolean {
  return !!process.env.DATABASE_URL;
}

export function getDb() {
  if (!hasDatabase()) {
    throw new Error('DATABASE_URL is not configured');
  }
  if (!db) {
    const sql = neon(process.env.DATABASE_URL!);
    db = drizzle(sql, { schema });
  }
  return db;
}
