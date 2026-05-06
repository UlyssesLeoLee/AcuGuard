import { NextRequest, NextResponse } from 'next/server';
import { comments } from '@/lib/mock-data';
export async function GET(req: NextRequest) { const issueId=req.nextUrl.searchParams.get('issueId'); return NextResponse.json(comments.filter(c=>c.issueId===issueId)); }
export async function POST(req: NextRequest) { const b=await req.json(); const c={id:`c${comments.length+1}`,...b,createdAt:new Date().toISOString()}; comments.push(c); return NextResponse.json(c,{status:201}); }
