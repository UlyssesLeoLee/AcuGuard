import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { getDb } from '@/db/client';
import { users } from '@/db/schema';
import { createSession, verifyPassword } from '@/lib/auth';

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  const payload = loginSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: 'Invalid login payload.' }, { status: 400 });
  }

  const db = getDb();
  const email = payload.data.email.trim().toLowerCase();

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email));

  if (!user || !verifyPassword(payload.data.password, user.passwordHash)) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const session = await createSession({ id: user.id, name: user.name, email: user.email });
  return NextResponse.json(session);
}
