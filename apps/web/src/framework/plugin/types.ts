import type React from 'react';

export type PluginCategory =
  | 'issue'
  | 'workflow'
  | 'agile'
  | 'ai'
  | 'report'
  | 'integration'
  | 'utility'
  | 'layout';

export type MountPoint =
  | 'issue.list.row'
  | 'issue.detail.sidebar'
  | 'kanban.card.badges'
  | 'ai.panel.actions'
  | (string & {});

export interface PluginMeta {
  id: string;
  version: string;
  name: string;
  description: string;
  category: PluginCategory;
  mountPoints: MountPoint[];
  permissions: string[];
  dependencies: string[];
}

export interface PluginDefinition<P extends Record<string, unknown> = Record<string, unknown>> {
  meta: PluginMeta;
  component: React.ComponentType<P>;
}
