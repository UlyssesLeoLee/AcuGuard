import type { Issue, Comment, IssueStatus, IssuePriority } from '@/lib/types';
import { mockIssues, mockComments } from '@/lib/mock-data';
import { EventBus } from '@/framework/events/bus';
import { E } from '@/framework/events/events';
import type { OperationSource } from '@/framework/events/events';

interface IssueFilters {
  projectId?: string;
  status?: IssueStatus | 'all';
  search?: string;
}

interface CreateIssueInput {
  projectId: string;
  title: string;
  description?: string;
  priority?: IssuePriority;
  assigneeId?: string;
  reporterId: string;
}

interface UpdateIssueInput {
  id: string;
  title?: string;
  description?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  assigneeId?: string;
}

interface AddCommentInput {
  issueId: string;
  authorId: string;
  body: string;
}

class IssueServiceImpl {
  private issues: Issue[] = [...mockIssues];
  private comments: Comment[] = [...mockComments];

  async list(filters?: IssueFilters): Promise<Issue[]> {
    let result = [...this.issues];

    if (filters?.projectId) {
      result = result.filter((i) => i.projectId === filters.projectId);
    }
    if (filters?.status && filters.status !== 'all') {
      result = result.filter((i) => i.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((i) => i.title.toLowerCase().includes(q));
    }

    return result;
  }

  async get(id: string): Promise<Issue | null> {
    return this.issues.find((i) => i.id === id) ?? null;
  }

  async create(input: CreateIssueInput, source: OperationSource = 'user'): Promise<Issue> {
    const now = new Date().toISOString();
    const issue: Issue = {
      id: `i${Date.now()}`,
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      status: 'todo',
      priority: input.priority ?? 'medium',
      assigneeId: input.assigneeId,
      reporterId: input.reporterId,
      createdAt: now,
      updatedAt: now,
    };

    this.issues = [issue, ...this.issues];

    EventBus.emit(E.ISSUE_CREATED, { issue, source });

    return issue;
  }

  async update(input: UpdateIssueInput, source: OperationSource = 'user'): Promise<Issue> {
    const idx = this.issues.findIndex((i) => i.id === input.id);
    if (idx === -1) throw new Error(`Issue ${input.id} not found`);

    const prev = this.issues[idx];
    const updated: Issue = {
      ...prev,
      ...input,
      updatedAt: new Date().toISOString(),
    };

    this.issues = [
      ...this.issues.slice(0, idx),
      updated,
      ...this.issues.slice(idx + 1),
    ];

    EventBus.emit(E.ISSUE_UPDATED, { issue: updated, source });

    if (input.status && input.status !== prev.status) {
      EventBus.emit(E.ISSUE_STATUS_CHANGED, {
        issueId: updated.id,
        from: prev.status,
        to: input.status,
        source,
      });
    }

    return updated;
  }

  async addComment(input: AddCommentInput, source: OperationSource = 'user'): Promise<Comment> {
    const comment: Comment = {
      id: `c${Date.now()}`,
      issueId: input.issueId,
      authorId: input.authorId,
      body: input.body,
      createdAt: new Date().toISOString(),
    };

    this.comments = [...this.comments, comment];

    EventBus.emit(E.COMMENT_ADDED, { comment, source });

    return comment;
  }

  async getComments(issueId: string): Promise<Comment[]> {
    return this.comments.filter((c) => c.issueId === issueId);
  }
}

export const IssueService = new IssueServiceImpl();
