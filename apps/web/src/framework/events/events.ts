import type { Issue, IssueStatus, Comment } from '@/lib/types';

export type OperationSource = 'user' | 'ai' | 'automation' | 'integration' | 'system';

export interface IssueCreatedPayload {
  issue: Issue;
  source: OperationSource;
}

export interface IssueUpdatedPayload {
  issue: Issue;
  source: OperationSource;
}

export interface IssueStatusChangedPayload {
  issueId: string;
  from: IssueStatus;
  to: IssueStatus;
  source: OperationSource;
}

export interface IssueSelectedPayload {
  issueId: string;
}

export interface CommentAddedPayload {
  comment: Comment;
  source: OperationSource;
}

export interface AIInsightGeneratedPayload {
  action: string;
  issueId: string;
  suggestions: string[];
  requiresConfirmation: boolean;
}

export interface AIActionConfirmedPayload {
  action: string;
  issueId: string;
  suggestions: string[];
}

export interface AIActionDismissedPayload {
  action: string;
  issueId: string;
}

export interface WorkflowTransitionPayload {
  issueId: string;
  from: IssueStatus;
  to: IssueStatus;
  source: OperationSource;
}

export const E = {
  ISSUE_CREATED: 'issue:created',
  ISSUE_UPDATED: 'issue:updated',
  ISSUE_STATUS_CHANGED: 'issue:status_changed',
  ISSUE_SELECTED: 'issue:selected',
  COMMENT_ADDED: 'comment:added',
  AI_ANALYSIS_REQUESTED: 'ai:analysis_requested',
  AI_INSIGHT_GENERATED: 'ai:insight_generated',
  AI_ACTION_CONFIRMED: 'ai:action_confirmed',
  AI_ACTION_DISMISSED: 'ai:action_dismissed',
  WORKFLOW_TRANSITION: 'workflow:transition',
  NOTIFICATION_RECEIVED: 'notification:received',
} as const;
