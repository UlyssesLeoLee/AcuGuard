'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderOpen, Plus, ChevronRight } from 'lucide-react';
import { ProjectService } from '@/services/project.service';
import { useWorkspaceContext } from '@/framework/context/providers';
import type { Project } from '@/lib/types';

export default function ProjectsPage() {
  const { workspace } = useWorkspaceContext();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    ProjectService.list(workspace?.id).then(setProjects);
  }, [workspace?.id]);

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Projects</h1>
          <p className="text-xs text-slate-400 mt-0.5">{workspace?.name ?? 'Workspace'}</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold text-white transition">
          <Plus className="w-3.5 h-3.5" />
          New
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm">No projects yet</p>
          <p className="text-slate-500 text-xs mt-1">Create a project to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}/issues`}
              className="flex items-center gap-3 bg-slate-800/60 hover:bg-slate-700/60 rounded-xl p-4 border border-slate-700/50 hover:border-indigo-500/40 transition-all"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ backgroundColor: project.color }}
              >
                {project.key.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{project.name}</p>
                {project.description && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">{project.description}</p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
