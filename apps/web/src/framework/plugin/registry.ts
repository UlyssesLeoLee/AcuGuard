import type { PluginDefinition, PluginCategory, MountPoint } from './types';

class PluginRegistryImpl {
  private readonly store = new Map<string, PluginDefinition<any>>();

  register<P extends Record<string, unknown>>(plugin: PluginDefinition<P>): this {
    this.store.set(plugin.meta.id, plugin);
    return this;
  }

  get(id: string): PluginDefinition<any> | undefined {
    return this.store.get(id);
  }

  byMountPoint(mountPoint: MountPoint): PluginDefinition<any>[] {
    return Array.from(this.store.values()).filter((p) =>
      p.meta.mountPoints.includes(mountPoint)
    );
  }

  byCategory(category: PluginCategory): PluginDefinition<any>[] {
    return Array.from(this.store.values()).filter(
      (p) => p.meta.category === category
    );
  }

  all(): PluginDefinition<any>[] {
    return Array.from(this.store.values());
  }
}

export const PluginRegistry = new PluginRegistryImpl();
