'use client';

import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IssueStatus } from '@/lib/types';

interface FilterCounts {
  all?: number;
  todo?: number;
  in_progress?: number;
  done?: number;
}

interface IssueFilterBarProps {
  search: string;
  status: IssueStatus | 'all';
  counts?: FilterCounts;
  onSearchChange: (value: string) => void;
  onStatusChange: (status: IssueStatus | 'all') => void;
}

const FILTERS: { value: IssueStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export function IssueFilterBar({
  search,
  status,
  counts,
  onSearchChange,
  onStatusChange,
}: IssueFilterBarProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search issues…"
          className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {FILTERS.map(({ value, label }) => {
          const count = counts?.[value as keyof FilterCounts];
          const isActive = status === value;
          return (
            <button
              key={value}
              onClick={() => onStatusChange(value)}
              className={cn(
                'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700/60 hover:text-slate-300'
              )}
            >
              {label}
              {count !== undefined && (
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                    isActive ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
