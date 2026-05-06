import { and, desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, hasDatabase } from '@/db/client';
import { issues as dbIssues } from '@/db/schema';
import { mockStore } from '@/lib/mock-store';
import { IssuePriority, IssueStatus } from '@/lib/types';

const isValidStatus = (value: string): value is IssueStatus => ['todo', 'in_progress', 'done'].includes(value);
const isValidPriority = (value: string): value is IssuePriority => ['low', 'medium', 'high'].includes(value);

const sortByUpdatedAtDesc = <T extends { updatedAt: string }>(items: T[]) =>
  [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId');
  const status = req.nextUrl.searchParams.get('status');
  const id = req.nextUrl.searchParams.get('id');

  if (!hasDatabase()) {
    const filtered = mockStore.listIssues().filter((item) => {
      if (id && item.id !== id) return false;
      if (projectId && item.projectId !== projectId) return false;
      if (status && item.status !== status) return false;
      return true;
    });

    return NextResponse.json(sortByUpdatedAtDesc(filtered));
  }

  const db = getDb();

  const data = id
    ? await db.select().from(dbIssues).where(eq(dbIssues.id, id)).orderBy(desc(dbIssues.updatedAt))
    : projectId && status
      ? await db.select().from(dbIssues).where(and(eq(dbIssues.projectId, projectId), eq(dbIssues.status, status))).orderBy(desc(dbIssues.updatedAt))
      : projectId
        ? await db.select().from(dbIssues).where(eq(dbIssues.projectId, projectId)).orderBy(desc(dbIssues.updatedAt))
        : status
          ? await db.select().from(dbIssues).where(eq(dbIssues.status, status)).orderBy(desc(dbIssues.updatedAt))
          : await db.select().from(dbIssues).orderBy(desc(dbIssues.updatedAt));

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!isValidStatus(body.status) || !isValidPriority(body.priority)) {
    return NextResponse.json({ error: 'Invalid status or priority' }, { status: 400 });
  }

  if (!hasDatabase()) {
    const created = mockStore.createIssue({ ...body, assigneeId: body.assigneeId ?? null });
    return NextResponse.json(created, { status: 201 });
  }

  const db = getDb();
  const [created] = await db.insert(dbIssues).values({ ...body, assigneeId: body.assigneeId ?? null, updatedAt: new Date() }).returning();
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { id, ...patch } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  if (patch.status && !isValidStatus(patch.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  if (patch.priority && !isValidPriority(patch.priority)) return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });

  if (!hasDatabase()) {
    if (Array.isArray(patch.orderedIds)) {
      mockStore.reorderIssues(patch.orderedIds.filter((value): value is string => typeof value === 'string'));
      return NextResponse.json({ ok: true });
    }

    const updated = mockStore.patchIssue(id, patch);
    if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(updated);
  }

  const db = getDb();
  const [updated] = await db.update(dbIssues).set({ ...patch, updatedAt: new Date() }).where(eq(dbIssues.id, id)).returning();
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(updated);
}
