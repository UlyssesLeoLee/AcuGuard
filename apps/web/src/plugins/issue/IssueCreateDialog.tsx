'use client';

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IssueService } from '@/services/issue.service';
import { useUserContext } from '@/framework/context/providers';
import type { IssuePriority } from '@/lib/types';

interface IssueCreateDialogProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

const PRIORITY_OPTIONS: { value: IssuePriority; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: 'text-red-400' },
  { value: 'medium', label: 'Medium', color: 'text-amber-400' },
  { value: 'low', label: 'Low', color: 'text-slate-400' },
];

export function IssueCreateDialog({ projectId, open, onClose }: IssueCreateDialogProps) {
  const { user } = useUserContext();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [loading, setLoading] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 100);
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
    }
  }, [open]);

  async function handleCreate() {
    if (!title.trim() || !user) return;
    setLoading(true);
    try {
      await IssueService.create(
        {
          projectId,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          reporterId: user.id,
        },
        'user'
      );
      onClose();
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full bg-slate-900 rounded-t-2xl border-t border-slate-700/50 p-4 space-y-4 pb-safe-bottom">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">New Issue</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Issue title"
            className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
            className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none"
          />

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Priority:</span>
            <div className="flex gap-1.5">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPriority(opt.value)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-medium border transition-all',
                    priority === opt.value
                      ? 'bg-slate-700 border-slate-500 text-white'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-700/60'
                  )}
                >
                  <span className={opt.color}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 border border-slate-700/50 text-sm text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || loading}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm text-white font-semibold transition"
          >
            {loading ? 'Creating…' : 'Create Issue'}
          </button>
        </div>
      </div>
    </div>
  );
}
