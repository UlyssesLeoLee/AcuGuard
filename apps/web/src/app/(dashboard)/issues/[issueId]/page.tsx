'use client';

import { useParams } from 'next/navigation';
import { IssueDetailPanel } from '@/plugins/issue/IssueDetailPanel';

/**
 * App: Issue Detail Page
 * Thin wrapper — all logic lives in the IssueDetailPanel plugin.
 */
export default function IssueDetailPage() {
  const { issueId } = useParams<{ issueId: string }>();
  return <IssueDetailPanel issueId={issueId} />;
}
