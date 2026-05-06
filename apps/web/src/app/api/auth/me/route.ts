import { NextRequest, NextResponse } from 'next/server';

import { parseBearerToken, resolveUserFromToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = parseBearerToken(request.headers.get('authorization'));
  if (!token) {
    return NextResponse.json({ error: 'Missing bearer token.' }, { status: 401 });
  }

  try {
    const user = await resolveUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
  }
}
