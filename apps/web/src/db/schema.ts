import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', { id: uuid('id').defaultRandom().primaryKey(), name: text('name').notNull(), email: text('email').notNull() });
export const workspaces = pgTable('workspaces', { id: uuid('id').defaultRandom().primaryKey(), name: text('name').notNull() });
export const projects = pgTable('projects', { id: uuid('id').defaultRandom().primaryKey(), name: text('name').notNull(), key: text('key').notNull(), workspaceId: uuid('workspace_id').notNull() });
export const issues = pgTable('issues', { id: uuid('id').defaultRandom().primaryKey(), projectId: uuid('project_id').notNull(), title: text('title').notNull(), description: text('description').notNull(), status: text('status').notNull(), priority: text('priority').notNull(), creatorId: uuid('creator_id').notNull(), assigneeId: uuid('assignee_id'), createdAt: timestamp('created_at').defaultNow().notNull(), updatedAt: timestamp('updated_at').defaultNow().notNull() });
export const comments = pgTable('comments', { id: uuid('id').defaultRandom().primaryKey(), issueId: uuid('issue_id').notNull(), authorId: uuid('author_id').notNull(), body: text('body').notNull(), createdAt: timestamp('created_at').defaultNow().notNull() });
export const aiLogs = pgTable('ai_logs', { id: uuid('id').defaultRandom().primaryKey(), issueId: uuid('issue_id'), action: text('action').notNull(), input: text('input').notNull(), output: text('output').notNull(), createdAt: timestamp('created_at').defaultNow().notNull() });
