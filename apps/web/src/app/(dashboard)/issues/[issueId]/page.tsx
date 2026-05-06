'use client';
import { useParams } from 'next/navigation';
import { comments, issues } from '@/lib/mock-data';
import { useState } from 'react';

export default function IssueDetail() {
  const { issueId } = useParams<{ issueId: string }>();
  const issue = issues.find(i => i.id === issueId);
  const [body, setBody] = useState('');

  if (!issue) return <div>Not found</div>;

  const cs = comments.filter(c => c.issueId === issueId);

  async function update(status: string) {
    await fetch('/api/issues', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: issueId, status }) });
    location.reload();
  }

  async function addComment() {
    await fetch('/api/comments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ issueId, authorId: 'u1', body }) });
    location.reload();
  }

  return (
    <div className='space-y-3'>
      <h1 className='text-xl font-semibold'>{issue.title}</h1>
      <p>{issue.description}</p>
      <div className='flex gap-2'>
        {['todo', 'in_progress', 'done'].map(s => (
          <button key={s} className='border px-2 py-1 rounded' onClick={() => update(s)}>{s}</button>
        ))}
      </div>
      <div className='space-y-2'>
        {cs.map(c => <div key={c.id} className='border p-2 rounded text-sm'>{c.body}</div>)}
      </div>
      <div className='flex gap-2'>
        <input className='border p-2 flex-1' value={body} onChange={e => setBody(e.target.value)} />
        <button onClick={addComment} className='bg-black text-white px-3 rounded'>Comment</button>
      </div>
    </div>
  );
}
