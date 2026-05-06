import { desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, hasDatabase } from '@/db/client';
import { comments as dbComments } from '@/db/schema';
import { comments as mockComments } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  const issueId = req.nextUrl.searchParams.get('issueId');
  if (!issueId) return NextResponse.json({ error: 'issueId is required' }, { status: 400 });

  if (!hasDatabase()) {
    const data = mockComments
      .filter((item) => item.issueId === issueId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(data);
  }

  const db = getDb();
  const data = await db.select().from(dbComments).where(eq(dbComments.issueId, issueId)).orderBy(desc(dbComments.createdAt));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!hasDatabase()) {
    return NextResponse.json({ error: 'Database is not configured for write operations' }, { status: 503 });
  }

  const db = getDb();
  const [created] = await db.insert(dbComments).values(body).returning();
  return NextResponse.json(created, { status: 201 });
}
