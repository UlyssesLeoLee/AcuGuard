'use client';

import { AIInsightGroup } from '@/plugin-groups/AIInsightGroup';

/**
 * App: AI Copilot Page
 * Delegates to AIInsightGroup. The AIConfirmationModal is already
 * mounted globally in AppShell — no need to render it here.
 */
export default function AIPage() {
  return <AIInsightGroup />;
}
