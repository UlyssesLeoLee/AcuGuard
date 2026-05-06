'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  ['/projects', 'Projects'],
  ['/board', 'Board'],
  ['/ai', 'AI Copilot'],
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">AcuGuard</p>
            <h1 className="text-lg font-semibold">Jira-like Workspace</h1>
          </div>
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">Neon PostgreSQL</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>

      <nav className="fixed bottom-3 left-1/2 z-20 grid w-[min(560px,92vw)] -translate-x-1/2 grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur">
        {nav.map(([href, label]) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-3 text-center text-sm font-medium transition ${active ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
