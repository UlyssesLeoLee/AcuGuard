import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { projects } from '@/db/schema';

export async function GET() {
  const data = await db.select().from(projects);
  return NextResponse.json(data);
}
