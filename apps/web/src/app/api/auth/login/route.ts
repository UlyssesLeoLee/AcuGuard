import { NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';
export async function POST() { return NextResponse.json({ token: signToken('u1'), user: { id: 'u1', name: 'Demo User' } }); }
