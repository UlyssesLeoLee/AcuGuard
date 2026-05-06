import { NextRequest, NextResponse } from 'next/server';
import { issues } from '@/lib/mock-data';
export async function GET(req: NextRequest) { const p=req.nextUrl.searchParams.get('projectId'); return NextResponse.json(p?issues.filter(i=>i.projectId===p):issues); }
export async function POST(req: NextRequest) { const body=await req.json(); const now=new Date().toISOString(); const issue={ id:`i${issues.length+1}`,...body,createdAt:now,updatedAt:now}; issues.push(issue); return NextResponse.json(issue,{status:201}); }
export async function PATCH(req: NextRequest) { const {id,...patch}=await req.json(); const t=issues.find(i=>i.id===id); if(!t) return NextResponse.json({error:'not found'},{status:404}); Object.assign(t,patch,{updatedAt:new Date().toISOString()}); return NextResponse.json(t); }
