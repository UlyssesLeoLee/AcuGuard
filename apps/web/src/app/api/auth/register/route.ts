import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { getDb } from '@/db/client';
import { users } from '@/db/schema';
import { createSession, hashPassword } from '@/lib/auth';

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  const payload = registerSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: 'Invalid registration payload.' }, { status: 400 });
  }

  const db = getDb();
  const email = payload.data.email.trim().toLowerCase();

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) {
    return NextResponse.json({ error: 'Email is already registered.' }, { status: 409 });
  }

  const [createdUser] = await db
    .insert(users)
    .values({
      name: payload.data.name.trim(),
      email,
      passwordHash: hashPassword(payload.data.password),
    })
    .returning({ id: users.id, name: users.name, email: users.email });

  const session = await createSession(createdUser);
  return NextResponse.json(session, { status: 201 });
}
