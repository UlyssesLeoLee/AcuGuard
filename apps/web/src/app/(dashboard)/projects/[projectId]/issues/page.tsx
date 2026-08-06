'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { IssueManagementGroup } from '@/plugin-groups/IssueManagementGroup';
import { useProjectContext } from '@/framework/context/providers';
import { projects } from '@/lib/mock-data';

/**
 * App: Project Issues Page
 * Sets the ProjectContext, then delegates entirely to IssueManagementGroup.
 */
export default function ProjectIssuesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { setProject } = useProjectContext();

  useEffect(() => {
    const project = projects.find((p) => p.id === projectId) ?? null;
    setProject(project);
    return () => setProject(null);
  }, [projectId, setProject]);

  return <IssueManagementGroup projectId={projectId} />;
}
