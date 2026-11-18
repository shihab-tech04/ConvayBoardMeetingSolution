/** Depth-first agenda-register projection for persisted L1/L2/L3 records. */
export interface AgendaRegisterNode {
  id: string;
  parent_agenda_id?: string | null;
  display_order?: number | null;
}

export function collectAgendaRegisterDescendants<T extends AgendaRegisterNode>(
  parentId: string,
  items: readonly T[],
): T[] {
  const byParent = new Map<string, T[]>();
  // Keep the first canonical occurrence before sorting. A later duplicate
  // without a display order must not reorder or replace the original node.
  const canonicalIds = new Set<string>();
  for (const item of items) {
    if (canonicalIds.has(item.id)) continue;
    canonicalIds.add(item.id);
    if (!item.parent_agenda_id) continue;
    const children = byParent.get(item.parent_agenda_id) ?? [];
    children.push(item);
    byParent.set(item.parent_agenda_id, children);
  }
  const seen = new Set([parentId]);
  const result: T[] = [];
  const visit = (id: string) => {
    const children = [...(byParent.get(id) ?? [])].sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
    );
    for (const child of children) {
      if (seen.has(child.id)) continue; // inconsistent legacy cycles and duplicate IDs
      seen.add(child.id);
      result.push(child);
      visit(child.id);
    }
  };
  visit(parentId);
  return result;
}
