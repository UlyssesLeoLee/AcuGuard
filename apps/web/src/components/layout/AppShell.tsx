'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
const nav=[['/projects','Projects'],['/board','Board'],['/ai','AI']];
export function AppShell({children}:{children:React.ReactNode}){const p=usePathname();return <div className='min-h-screen pb-16'><header className='p-3 border-b font-semibold'>AcuGuard AI Jira MVP</header><main className='p-3'>{children}</main><nav className='fixed bottom-0 left-0 right-0 bg-white border-t grid grid-cols-3'>{nav.map(([href,label])=><Link key={href} href={href} className={`p-3 text-center text-sm ${p.startsWith(href)?'font-bold text-blue-600':''}`}>{label}</Link>)}</nav></div>;}
