import { NextResponse } from 'next/server';
import { projects } from '@/lib/mock-data';
export async function GET() { return NextResponse.json(projects); }
