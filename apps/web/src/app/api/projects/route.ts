import { NextResponse } from 'next/server';
import { getDb } from '@/db/client';
import { projects } from '@/db/schema';

export async function GET() {
  const db = getDb();
  const data = await db.select().from(projects);
  return NextResponse.json(data);
}
