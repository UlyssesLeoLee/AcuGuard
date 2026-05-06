import { and, desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { issues } from '@/db/schema';
import { IssuePriority, IssueStatus } from '@/lib/types';

const isValidStatus = (value: string): value is IssueStatus => ['todo', 'in_progress', 'done'].includes(value);
const isValidPriority = (value: string): value is IssuePriority => ['low', 'medium', 'high'].includes(value);

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId');
  const status = req.nextUrl.searchParams.get('status');

  const data = projectId && status
    ? await db.select().from(issues).where(and(eq(issues.projectId, projectId), eq(issues.status, status))).orderBy(desc(issues.updatedAt))
    : projectId
      ? await db.select().from(issues).where(eq(issues.projectId, projectId)).orderBy(desc(issues.updatedAt))
      : status
        ? await db.select().from(issues).where(eq(issues.status, status)).orderBy(desc(issues.updatedAt))
        : await db.select().from(issues).orderBy(desc(issues.updatedAt));

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!isValidStatus(body.status) || !isValidPriority(body.priority)) {
    return NextResponse.json({ error: 'Invalid status or priority' }, { status: 400 });
  }

  const [created] = await db.insert(issues).values({ ...body, assigneeId: body.assigneeId ?? null, updatedAt: new Date() }).returning();
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { id, ...patch } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  if (patch.status && !isValidStatus(patch.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  if (patch.priority && !isValidPriority(patch.priority)) return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });

  const [updated] = await db.update(issues).set({ ...patch, updatedAt: new Date() }).where(eq(issues.id, id)).returning();
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(updated);
}
