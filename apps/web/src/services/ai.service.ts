import { EventBus } from '@/framework/events/bus';
import { E } from '@/framework/events/events';
import type { OperationSource } from '@/framework/events/events';

export type AIActionType = 'summary' | 'subtasks' | 'priority' | 'comment';
type AIAction = AIActionType;

interface AIContext {
  issueId: string;
  title?: string;
  description?: string;
  currentStatus?: string;
  currentPriority?: string;
}

const MOCK_SUGGESTIONS: Record<AIAction, string[]> = {
  summary: [
    'Issue involves implementing a core feature with cross-platform impact.',
    'Estimated complexity: medium-high based on scope and dependencies.',
    'Recommend breaking into 2–3 sub-tasks for parallel execution.',
  ],
  subtasks: [
    'Research and document technical requirements',
    'Implement core functionality with unit tests',
    'Integration testing and edge case handling',
    'Code review and documentation update',
  ],
  priority: [
    'Based on impact analysis: recommend upgrading to HIGH priority.',
    'This blocks 2 downstream tasks currently in the backlog.',
    'Estimated business impact: customer-facing functionality affected.',
  ],
  comment: [
    'Progress update: initial investigation complete, implementation underway.',
    'No blockers identified at this time.',
    'Expected completion: within current sprint.',
  ],
};

class AIServiceImpl {
  async analyze(
    action: AIAction,
    ctx: AIContext,
    source: OperationSource = 'user'
  ): Promise<string[]> {
    EventBus.emit(E.AI_ANALYSIS_REQUESTED, { action, issueId: ctx.issueId, source });

    await new Promise((res) => setTimeout(res, 1200));

    const suggestions = MOCK_SUGGESTIONS[action] ?? [
      'AI analysis complete. Review suggestions carefully before applying.',
    ];

    EventBus.emit(E.AI_INSIGHT_GENERATED, {
      action,
      issueId: ctx.issueId,
      suggestions,
      requiresConfirmation: true,
    });

    return suggestions;
  }
}

export const AIService = new AIServiceImpl();
