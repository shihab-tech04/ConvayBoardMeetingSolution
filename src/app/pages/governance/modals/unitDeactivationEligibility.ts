/** GV-03: client-facing gate; SQL still must independently enforce this rule. */
export interface UnitDeactivationDependencies {
  assignedUsers: number;
  childUnits: number;
  activeHeads: number;
}
export function unitCanDeactivate(dependencies: UnitDeactivationDependencies): boolean {
  return Object.values(dependencies).every(count =>
    Number.isSafeInteger(count) && count === 0,
  );
}
