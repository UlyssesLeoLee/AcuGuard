import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { and, eq, gt } from 'drizzle-orm';

import { getDb } from '@/db/client';
import { authSessions, users } from '@/db/schema';

const SECRET = process.env.JWT_SECRET || 'dev-secret';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const SESSION_TTL_DAYS = 30;

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  const digest = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${digest}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  const [salt, digest] = passwordHash.split(':');
  if (!salt || !digest) return false;

  const candidate = crypto.scryptSync(password, salt, 64);
  const known = Buffer.from(digest, 'hex');

  if (candidate.length !== known.length) return false;
  return crypto.timingSafeEqual(candidate, known);
}

function signToken(userId: string, sessionId: string) {
  return jwt.sign({ userId, sessionId }, SECRET, { expiresIn: TOKEN_TTL_SECONDS });
}

export function verifyToken(token: string): { userId: string; sessionId: string } {
  return jwt.verify(token, SECRET) as { userId: string; sessionId: string };
}

export async function createSession(user: AuthUser) {
  const db = getDb();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const [session] = await db
    .insert(authSessions)
    .values({ userId: user.id, expiresAt })
    .returning({ id: authSessions.id, expiresAt: authSessions.expiresAt });

  const token = signToken(user.id, session.id);
  return { token, sessionId: session.id, expiresAt: session.expiresAt, user };
}

export async function resolveUserFromToken(token: string) {
  const payload = verifyToken(token);
  const db = getDb();

  const [session] = await db
    .select({ id: authSessions.id, userId: authSessions.userId, expiresAt: authSessions.expiresAt, revokedAt: authSessions.revokedAt })
    .from(authSessions)
    .where(and(eq(authSessions.id, payload.sessionId), eq(authSessions.userId, payload.userId), gt(authSessions.expiresAt, new Date())));

  if (!session || session.revokedAt) return null;

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, payload.userId));

  return user ?? null;
}

export async function revokeSession(sessionId: string) {
  const db = getDb();
  await db.update(authSessions).set({ revokedAt: new Date() }).where(eq(authSessions.id, sessionId));
}

export function parseBearerToken(headerValue: string | null) {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}
