'use client';
import { useState } from 'react'; import { AIPluginGroup, Plugin } from '@/components/plugins/PluginGroups';
const actions=['summary','subtasks','priority','comment'] as const;
export default function AI(){const [res,setRes]=useState(''); async function run(action:string){const r=await fetch(`/api/ai/${action}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'Build MVP issue'})}); const d=await r.json(); setRes(d.suggestions.join('\n'));}
return <AIPluginGroup><Plugin title='AI Assistant Panel'><div className='flex flex-wrap gap-2'>{actions.map(a=><button key={a} onClick={()=>run(a)} className='border px-3 py-1 rounded'>{a}</button>)}</div><pre className='bg-gray-100 p-2 rounded text-xs whitespace-pre-wrap'>{res||'Run any AI action to view suggestion. User confirms before writing DB.'}</pre></Plugin></AIPluginGroup>}
