import { NextResponse } from 'next/server';
import { getDb, hasDatabase } from '@/db/client';
import { projects } from '@/db/schema';
import { mockStore } from '@/lib/mock-store';

export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json(mockStore.listProjects());
  }

  const db = getDb();
  const data = await db.select().from(projects);
  return NextResponse.json(data);
}
