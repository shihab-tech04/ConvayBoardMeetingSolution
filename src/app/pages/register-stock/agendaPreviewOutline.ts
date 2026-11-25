import {
  collectAgendaRegisterDescendants,
  type AgendaRegisterNode,
} from "./agendaRegisterDescendants";

/** A display-only, depth-first outline for the existing Full Agenda Preview modal. */
export interface AgendaPreviewOutlineRow<T extends AgendaRegisterNode> {
  item: T;
  outline: string;
  level: number;
}

/**
 * Use the canonical register hierarchy: deduplicate IDs, sort siblings by
 * display_order, ignore corrupt cycles, and preserve all reachable L2/L3 rows.
 * This is a read projection; no records, permissions or SQL are mutated.
 */
export function buildAgendaPreviewOutline<T extends AgendaRegisterNode>(
  parentId: string,
  parentOutline: string,
  items: readonly T[],
): AgendaPreviewOutlineRow<T>[] {
  const pathById = new Map<string, string>([[parentId, parentOutline]]);
  const siblingCounts = new Map<string, number>();
  const rows: AgendaPreviewOutlineRow<T>[] = [];

  for (const item of collectAgendaRegisterDescendants(parentId, items)) {
    const parentKey = item.parent_agenda_id ?? "";
    const parentPath = pathById.get(parentKey);
    if (!parentPath) continue;
    const position = (siblingCounts.get(parentKey) ?? 0) + 1;
    siblingCounts.set(parentKey, position);
    const outline = `${parentPath}.${position}`;
    pathById.set(item.id, outline);
    rows.push({ item, outline, level: outline.split(".").length });
  }
  return rows;
}
