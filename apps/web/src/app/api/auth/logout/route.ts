import { NextRequest, NextResponse } from 'next/server';

import { revokeSession, verifyToken, parseBearerToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const token = parseBearerToken(request.headers.get('authorization'));
  if (!token) {
    return NextResponse.json({ error: 'Missing bearer token.' }, { status: 401 });
  }

  try {
    const payload = verifyToken(token);
    await revokeSession(payload.sessionId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid token.' }, { status: 401 });
  }
}
