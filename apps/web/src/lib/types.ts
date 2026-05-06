export type IssueStatus = 'todo' | 'in_progress' | 'done';
export type IssuePriority = 'low' | 'medium' | 'high';

export interface User { id: string; name: string; email: string; }
export interface Workspace { id: string; name: string; }
export interface Project { id: string; name: string; key: string; workspaceId: string; }
export interface Issue {
  id: string; projectId: string; title: string; description: string; status: IssueStatus; priority: IssuePriority;
  creatorId: string; assigneeId?: string; createdAt: string; updatedAt: string;
}
export interface Comment { id: string; issueId: string; authorId: string; body: string; createdAt: string; }
export interface AiLog { id: string; issueId?: string; action: string; input: string; output: string; createdAt: string; }
