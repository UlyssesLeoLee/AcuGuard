'use client';

import {
  User, Settings, Bell, Shield, Moon, ChevronRight, LogOut
} from 'lucide-react';
import { useUserContext } from '@/framework/context/providers';
import { getInitials } from '@/lib/utils';

const MENU_SECTIONS = [
  {
    title: 'Account',
    items: [
      { icon: User, label: 'Profile', description: 'Edit your profile information' },
      { icon: Bell, label: 'Notifications', description: 'Manage notification preferences' },
      { icon: Shield, label: 'Security', description: 'Password and 2FA settings' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: Moon, label: 'Appearance', description: 'Theme and display settings' },
      { icon: Settings, label: 'Integrations', description: 'Connected apps and services' },
    ],
  },
];

export default function MePage() {
  const { user } = useUserContext();

  return (
    <div className="px-4 py-4 space-y-5">
      <div className="flex items-center gap-4 bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
          <span className="text-xl font-bold text-white">
            {user ? getInitials(user.name) : '?'}
          </span>
        </div>
        <div>
          <p className="text-base font-bold text-white">{user?.name ?? 'Guest'}</p>
          <p className="text-sm text-slate-400">{user?.email ?? ''}</p>
          <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 bg-indigo-900/60 text-indigo-300 rounded-full border border-indigo-700/40">
            Pro Member
          </span>
        </div>
      </div>

      {MENU_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 px-1">
            {section.title}
          </p>
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 divide-y divide-slate-700/40">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-700/40 transition text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-700/60 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200">{item.label}</p>
                    <p className="text-xs text-slate-500 truncate">{item.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="bg-slate-800/60 rounded-xl border border-slate-700/50">
        <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-900/20 transition text-left rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-red-900/40 flex items-center justify-center shrink-0">
            <LogOut className="w-4 h-4 text-red-400" />
          </div>
          <span className="text-sm font-medium text-red-400">Sign Out</span>
        </button>
      </div>

      <p className="text-center text-xs text-slate-600 pb-2">AcuGuard v0.1.0</p>
    </div>
  );
}
