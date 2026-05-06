import { desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { comments } from '@/db/schema';

export async function GET(req: NextRequest) {
  const issueId = req.nextUrl.searchParams.get('issueId');
  if (!issueId) return NextResponse.json({ error: 'issueId is required' }, { status: 400 });

  const data = await db.select().from(comments).where(eq(comments.issueId, issueId)).orderBy(desc(comments.createdAt));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const [created] = await db.insert(comments).values(body).returning();
  return NextResponse.json(created, { status: 201 });
}
