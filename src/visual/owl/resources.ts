import type { Disposable } from "./three-types.ts";

/** Every GPU resource has one owner, including shared materials and late textures. */
export function createResourceScope() {
  const resources = new Set<Disposable>();
  let disposed = false;
  return {
    get disposed() { return disposed; },
    own<T extends Disposable>(resource: T): T {
      if (disposed) resource.dispose();
      else resources.add(resource);
      return resource;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const resource of resources) resource.dispose();
      resources.clear();
    },
  };
}

export type ResourceScope = ReturnType<typeof createResourceScope>;
