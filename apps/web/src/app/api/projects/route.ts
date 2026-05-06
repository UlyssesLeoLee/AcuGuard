import { NextResponse } from 'next/server';
import { getDb, hasDatabase } from '@/db/client';
import { projects } from '@/db/schema';
import { projects as mockProjects } from '@/lib/mock-data';

export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json(mockProjects);
  }

  const db = getDb();
  const data = await db.select().from(projects);
  return NextResponse.json(data);
}
