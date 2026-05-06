import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest){ const b=await req.json(); const result='comment';
const suggestions={summary:['Issue summary: '+(b.title||'')+' / focus on delivery risks.'],subtasks:['Create DB schema','Implement APIs','Add responsive UI'],priority:['Recommended priority: high due to user impact and deadline.'],comment:['Suggested comment: I validated scope and will update ETA by EOD.']};
return NextResponse.json({action:result,suggestions:suggestions[result as keyof typeof suggestions]??['N/A'],requiresConfirmation:true}); }
