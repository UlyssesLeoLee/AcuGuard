export type IssueStatus = 'todo' | 'in_progress' | 'done';
export type IssuePriority = 'high' | 'medium' | 'low';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  key: string;
  description?: string;
  color: string;
  createdAt: string;
}

export interface Issue {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeId?: string;
  reporterId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  issueId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface AiLog {
  id: string;
  issueId: string;
  action: string;
  input: string;
  output: string;
  confirmedBy?: string;
  createdAt: string;
}
