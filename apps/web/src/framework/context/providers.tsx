'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { User, Workspace, Project } from '@/lib/types';
import { mockUsers, mockWorkspaces } from '@/lib/mock-data';
import { EventBus } from '@/framework/events/bus';
import { E } from '@/framework/events/events';
import type {
  AIInsightGeneratedPayload,
  AIActionConfirmedPayload,
  AIActionDismissedPayload,
} from '@/framework/events/events';

// ─── User ──────────────────────────────────────────────────────────────────

interface UserContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  setUser: () => {},
});

export const useUserContext = () => useContext(UserContext);

// ─── Workspace ─────────────────────────────────────────────────────────────

interface WorkspaceContextValue {
  workspace: Workspace | null;
  workspaces: Workspace[];
  setWorkspace: (ws: Workspace | null) => void;
  switchWorkspace: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspace: null,
  workspaces: [],
  setWorkspace: () => {},
  switchWorkspace: () => {},
});

export const useWorkspaceContext = () => useContext(WorkspaceContext);

// ─── Project ───────────────────────────────────────────────────────────────

interface ProjectContextValue {
  project: Project | null;
  setProject: (project: Project | null) => void;
}

const ProjectContext = createContext<ProjectContextValue>({
  project: null,
  setProject: () => {},
});

export const useProjectContext = () => useContext(ProjectContext);

// ─── Issue ─────────────────────────────────────────────────────────────────

interface IssueContextValue {
  selectedIssueId: string | null;
  setSelectedIssueId: (id: string | null) => void;
}

const IssueContext = createContext<IssueContextValue>({
  selectedIssueId: null,
  setSelectedIssueId: () => {},
});

export const useIssueContext = () => useContext(IssueContext);

// ─── Permission ────────────────────────────────────────────────────────────

interface PermissionContextValue {
  permissions: Set<string>;
  can: (permission: string) => boolean;
}

const DEMO_PERMISSIONS = [
  'issue:create',
  'issue:update',
  'issue:delete',
  'comment:create',
  'ai:use',
  'ai:confirm',
  'project:view',
  'project:manage',
  'sprint:view',
  'sprint:manage',
];

const PermissionContext = createContext<PermissionContextValue>({
  permissions: new Set(DEMO_PERMISSIONS),
  can: () => true,
});

export const usePermissionContext = () => useContext(PermissionContext);

// ─── AI ────────────────────────────────────────────────────────────────────

export interface PendingAIAction {
  action: string;
  issueId: string;
  suggestions: string[];
}

interface AIContextValue {
  isProcessing: boolean;
  pendingAction: PendingAIAction | null;
  confirmAction: () => void;
  dismissAction: () => void;
}

const AIContext = createContext<AIContextValue>({
  isProcessing: false,
  pendingAction: null,
  confirmAction: () => {},
  dismissAction: () => {},
});


export const useAIContext = () => useContext(AIContext);

// ─── PlatformProviders ─────────────────────────────────────────────────────

export function PlatformProviders({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(mockUsers[0]);
  const [workspace, setWorkspace] = useState<Workspace | null>(mockWorkspaces[0]);
  const switchWorkspace = useCallback((id: string) => {
    const ws = mockWorkspaces.find((w) => w.id === id) ?? null;
    setWorkspace(ws);
  }, []);
  const [project, setProject] = useState<Project | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAIAction | null>(null);

  const permissions = new Set(DEMO_PERMISSIONS);
  const can = useCallback((p: string) => permissions.has(p), []);

  useEffect(() => {
    const unsubRequested = EventBus.on(E.AI_ANALYSIS_REQUESTED, () => {
      setIsProcessing(true);
    });

    const unsubGenerated = EventBus.on<AIInsightGeneratedPayload>(
      E.AI_INSIGHT_GENERATED,
      (payload) => {
        setIsProcessing(false);
        if (payload.requiresConfirmation) {
          setPendingAction({
            action: payload.action,
            issueId: payload.issueId,
            suggestions: payload.suggestions,
          });
        }
      }
    );

    const unsubSelected = EventBus.on<{ issueId: string }>(
      E.ISSUE_SELECTED,
      (payload) => setSelectedIssueId(payload.issueId)
    );

    return () => {
      unsubRequested();
      unsubGenerated();
      unsubSelected();
    };
  }, []);

  const confirmAction = useCallback(() => {
    setPendingAction((current) => {
      if (!current) return null;
      const payload: AIActionConfirmedPayload = {
        action: current.action,
        issueId: current.issueId,
        suggestions: current.suggestions,
      };
      EventBus.emit(E.AI_ACTION_CONFIRMED, payload);
      return null;
    });
  }, []);

  const dismissAction = useCallback(() => {
    if (pendingAction) {
      const payload: AIActionDismissedPayload = {
        action: pendingAction.action,
        issueId: pendingAction.issueId,
      };
      EventBus.emit(E.AI_ACTION_DISMISSED, payload);
    }
    setPendingAction(null);
  }, [pendingAction]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <WorkspaceContext.Provider
        value={{ workspace, workspaces: mockWorkspaces, setWorkspace, switchWorkspace }}
      >
        <ProjectContext.Provider value={{ project, setProject }}>
          <IssueContext.Provider value={{ selectedIssueId, setSelectedIssueId }}>
            <PermissionContext.Provider value={{ permissions, can }}>
              <AIContext.Provider
                value={{ isProcessing, pendingAction, confirmAction, dismissAction }}
              >
                {children}
              </AIContext.Provider>
            </PermissionContext.Provider>
          </IssueContext.Provider>
        </ProjectContext.Provider>
      </WorkspaceContext.Provider>
    </UserContext.Provider>
  );
}
