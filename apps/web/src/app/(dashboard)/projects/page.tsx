import Link from 'next/link'; import { projects } from '@/lib/mock-data';
export default function Projects(){return <div className='space-y-3'>{projects.map(p=><Link className='block border rounded p-3' key={p.id} href={`/projects/${p.id}/issues`}><div className='font-medium'>{p.name}</div><div className='text-sm text-gray-500'>{p.key}</div></Link>)}</div>}
