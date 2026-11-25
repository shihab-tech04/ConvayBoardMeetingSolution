/** A verified session never implies the user has any workspace permissions. */
export type WorkspaceAccessState = "ready" | "verifying" | "verification_failed" | "awaiting_permissions";

export function workspaceAccessState(
  access: { loaded: boolean; error: string | null },
  visibleNavigationCount: number,
): WorkspaceAccessState {
  if (!access.loaded) return access.error ? "verification_failed" : "verifying";
  return visibleNavigationCount > 0 ? "ready" : "awaiting_permissions";
}

/** A roleless user can have an empty navigation tree; never dereference its icon. */
export function resolveActiveMainItem<T extends { id: string }>(
  visibleItems: readonly T[],
  activeId: string,
): T | null {
  return visibleItems.find(item => item.id === activeId) ?? visibleItems[0] ?? null;
}
