import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, hasDatabase } from '@/db/client';
import { issues as dbIssues } from '@/db/schema';
import { runAIChatCommand } from '@/lib/ai';
import { mockStore } from '@/lib/mock-store';
import { IssueStatus } from '@/lib/types';

const VALID_STATUS: IssueStatus[] = ['todo', 'in_progress', 'done'];

function parseStatusCommand(rawCommand: string) {
  const matches = rawCommand.trim().match(/^\/set-status\s+(todo|in_progress|done)$/i);
  if (!matches) return null;
  return matches[1].toLowerCase() as IssueStatus;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const command = String(body.command ?? '');
    const payload = (body.payload ?? {}) as Record<string, unknown>;
    const issueId = typeof payload.issueId === 'string' ? payload.issueId : '';

    const status = parseStatusCommand(command);
    if (status) {
      if (!issueId) {
        return NextResponse.json({ error: 'issueId is required for /set-status command.' }, { status: 400 });
      }

      if (!VALID_STATUS.includes(status)) {
        return NextResponse.json({ error: 'Invalid status for /set-status command.' }, { status: 400 });
      }

      if (!hasDatabase()) {
        const updated = mockStore.patchIssue(issueId, { status, updatedAt: new Date().toISOString() });
        if (!updated) {
          return NextResponse.json({ error: 'Issue not found for /set-status command.' }, { status: 404 });
        }

        return NextResponse.json({ ok: true, action: 'set-status', suggestions: [`Issue moved to ${status}.`], updatedIssue: updated });
      }

      const db = getDb();
      const [updated] = await db
        .update(dbIssues)
        .set({ status, updatedAt: new Date() })
        .where(eq(dbIssues.id, issueId))
        .returning();

      if (!updated) {
        return NextResponse.json({ error: 'Issue not found for /set-status command.' }, { status: 404 });
      }

      return NextResponse.json({ ok: true, action: 'set-status', suggestions: [`Issue moved to ${status}.`], updatedIssue: updated });
    }

    const result = await runAIChatCommand(command, payload, req.headers.get('x-user-api-key') ?? undefined);

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown AI error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
