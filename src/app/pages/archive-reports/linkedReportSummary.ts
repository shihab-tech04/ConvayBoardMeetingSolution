/** Read-only report joins. Resolve only unique, nonempty references from the
 * already authorized SQL registry; never attribute an ambiguous legacy label. */
export type LinkedReportRecord = { id: string; [key: string]: unknown };
const key = (value: unknown) => typeof value === "string" ? value.trim() : "";

function referenceIndex<T extends { id: string }>(records: readonly T[], aliases: (record: T) => unknown[]) {
  const index = new Map<string, Set<string>>();
  for (const record of records) {
    const id = key(record.id);
    if (!id) continue;
    for (const value of aliases(record)) {
      const ref = key(value);
      if (!ref) continue;
      const ids = index.get(ref) ?? new Set<string>();
      ids.add(id);
      index.set(ref, ids);
    }
  }
  return index;
}

export function indexReportLinks<P extends { id: string }, C extends { id: string }>(
  parents: readonly P[], children: readonly C[], aliases: (record: P) => unknown[], reference: (record: C) => unknown,
): Map<string, C[]> {
  const index = referenceIndex(parents, aliases);
  const linked = new Map<string, Map<string, C>>();
  for (const child of children) {
    const id = key(child.id), ids = index.get(key(reference(child)));
    if (!id || !ids || ids.size !== 1) continue;
    const parent = [...ids][0];
    const records = linked.get(parent) ?? new Map<string, C>();
    if (!records.has(id)) records.set(id, child);
    linked.set(parent, records);
  }
  return new Map([...linked].map(([id, records]) => [id, [...records.values()]]));
}

export function selectedReportLinks<T extends { id: string }>(
  rows: readonly Record<string, unknown>[], linked: ReadonlyMap<string, readonly T[]>,
): T[] {
  const result = new Map<string, T>();
  for (const row of rows) {
    for (const record of linked.get(key(row.id)) ?? []) {
      if (key(record.id) && !result.has(record.id)) result.set(record.id, record);
    }
  }
  return [...result.values()];
}
