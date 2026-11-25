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


/**
 * Return the canonical parent chain, closest parent first.
 * Corrupt/self-referential cycles fail closed with no ancestor writes:
 * publishing a partially recomputed status would misrepresent the hierarchy.
 */
export function collectAgendaRegisterAncestors<T extends AgendaRegisterNode>(
  itemId: string,
  items: readonly T[],
): T[] {
  const byId = new Map<string, T>();
  for (const item of items) if (!byId.has(item.id)) byId.set(item.id, item);
  const seen = new Set<string>([itemId]);
  const ancestors: T[] = [];
  let current = byId.get(itemId);
  while (current?.parent_agenda_id) {
    const parentId = current.parent_agenda_id;
    if (seen.has(parentId)) return [];
    const parent = byId.get(parentId);
    if (!parent) break;
    seen.add(parentId);
    ancestors.push(parent);
    current = parent;
  }
  return ancestors;
}
