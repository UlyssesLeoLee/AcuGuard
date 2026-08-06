'use client';

import { AIInsightPanel } from '@/plugins/ai/AIInsightPanel';

export interface AIInsightGroupProps {
  /** Optional: pre-select an issue when the AI panel opens from issue context. */
  issueId?: string;
}

/**
 * PluginGroup: AIInsightGroup
 * Composes: AIInsightPanel
 * (AIConfirmationModal is mounted globally in the Shell)
 */
export function AIInsightGroup({ issueId }: AIInsightGroupProps) {
  return <AIInsightPanel preselectedIssueId={issueId} />;
}
