import { AiLog, Comment, Issue, Project, User, Workspace } from './types';

export const users: User[] = [{ id: 'u1', name: 'Demo User', email: 'demo@acuguard.ai' }];
export const workspaces: Workspace[] = [{ id: 'w1', name: 'AcuGuard' }];
export const projects: Project[] = [{ id: 'p1', name: 'MVP Launch', key: 'MVP', workspaceId: 'w1' }];
export const issues: Issue[] = [
  { id: 'i1', projectId: 'p1', title: 'Set up Vercel deployment', description: 'Connect GitHub and configure Neon DATABASE_URL.', status: 'todo', priority: 'high', creatorId: 'u1', assigneeId: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'i2', projectId: 'p1', title: 'Build Kanban board', description: '3 columns: todo/in progress/done', status: 'in_progress', priority: 'medium', creatorId: 'u1', assigneeId: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];
export const comments: Comment[] = [];
export const aiLogs: AiLog[] = [];
