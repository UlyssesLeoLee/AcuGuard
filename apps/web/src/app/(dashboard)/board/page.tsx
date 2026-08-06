'use client';

import { KanbanBoard } from '@/plugins/kanban/KanbanBoard';

/**
 * App: Board Page
 * Delegates to the KanbanBoard plugin (Kanban + List views).
 */
export default function BoardPage() {
  return <KanbanBoard />;
}
