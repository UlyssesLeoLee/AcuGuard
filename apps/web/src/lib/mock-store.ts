import { comments as initialComments, issues as initialIssues, projects as initialProjects } from '@/lib/mock-data';
import { Comment, Issue, Project } from '@/lib/types';

const issuesStore: Issue[] = initialIssues.map((item) => ({ ...item }));
const commentsStore: Comment[] = initialComments.map((item) => ({ ...item }));
const projectsStore: Project[] = initialProjects.map((item) => ({ ...item }));

const nowIso = () => new Date().toISOString();

export const mockStore = {
  listProjects: () => projectsStore,
  listIssues: () => issuesStore,
  listComments: () => commentsStore,
  createIssue: (input: Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>) => {
    const created: Issue = { id: `i-${crypto.randomUUID()}`, ...input, createdAt: nowIso(), updatedAt: nowIso() };
    issuesStore.unshift(created);
    return created;
  },
  patchIssue: (id: string, patch: Partial<Omit<Issue, 'id' | 'createdAt'>>) => {
    const target = issuesStore.find((item) => item.id === id);
    if (!target) return null;
    Object.assign(target, patch, { updatedAt: nowIso() });
    return target;
  },
  reorderIssues: (orderedIds: string[]) => {
    const rank = new Map(orderedIds.map((id, index) => [id, index]));
    issuesStore.sort((a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER));
  },
  createComment: (input: Omit<Comment, 'id' | 'createdAt'>) => {
    const created: Comment = { id: `c-${crypto.randomUUID()}`, ...input, createdAt: nowIso() };
    commentsStore.unshift(created);
    return created;
  },
};
