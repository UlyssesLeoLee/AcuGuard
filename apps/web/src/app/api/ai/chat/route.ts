import { NextRequest, NextResponse } from 'next/server';
import { runAIChatCommand } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const command = String(body.command ?? '');
    const payload = (body.payload ?? {}) as Record<string, unknown>;

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
