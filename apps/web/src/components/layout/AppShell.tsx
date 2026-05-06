'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Kanban, Sparkles, User, Bell } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/projects', icon: LayoutGrid, label: 'Projects' },
  { href: '/board', icon: Kanban, label: 'Board' },
  { href: '/ai', icon: Sparkles, label: 'AI' },
  { href: '/me', icon: User, label: 'Me' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      className="min-h-screen bg-slate-50"
      style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
    >
      {/* Global header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 shadow-sm">
              <span className="text-[11px] font-bold text-white tracking-tight">AG</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-slate-900 leading-none">AcuGuard</p>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">Workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="relative flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition"
              aria-label="Notifications"
            >
              <Bell size={17} strokeWidth={1.75} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-1 ring-white" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700 select-none">
              DU
            </div>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="px-4 py-4">{children}</main>

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-sm"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-4">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (pathname.startsWith(href) && href !== '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                  active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon
                  size={21}
                  strokeWidth={active ? 2.25 : 1.75}
                  className={active ? 'text-indigo-600' : 'text-slate-400'}
                />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
