import type { Project } from '@/lib/types';
import { projects } from '@/lib/mock-data';

class ProjectServiceImpl {
  async list(workspaceId?: string): Promise<Project[]> {
    if (workspaceId) {
      return projects.filter((p) => p.workspaceId === workspaceId);
    }
    return [...projects];
  }

  async get(id: string): Promise<Project | null> {
    return projects.find((p) => p.id === id) ?? null;
  }
}

export const ProjectService = new ProjectServiceImpl();
