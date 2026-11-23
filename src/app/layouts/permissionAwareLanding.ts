/**
 * Resolve the first route already visible to this authenticated account.
 * The caller supplies the server-permission-filtered navigation tree.
 *
 * This does not grant permissions or bypass direct-route authorization.
 */
export interface PermittedNavTree {
  id: string;
  children: readonly {
    id: string;
    children?: readonly { id: string }[];
  }[];
}

export function firstPermittedLandingPath(nav: readonly PermittedNavTree[]): string | null {
  for (const main of nav) {
    for (const sub of main.children) {
      const third = sub.children?.[0];
      return `/${main.id}/${sub.id}${third ? "/" + third.id : ""}`;
    }
  }
  return null;
}

/**
 * Only the implicit default dashboard entry may redirect automatically.
 * Explicit deep links to denied pages must continue to fail closed.
 */
export function redirectDeniedDefaultDashboard(
  pathname: string,
  canVisitDashboard: boolean,
  nav: readonly PermittedNavTree[],
): string | null {
  if (pathname !== "/home/overview" || canVisitDashboard) return null;
  const candidate = firstPermittedLandingPath(nav);
  return candidate && candidate !== pathname ? candidate : null;
}
