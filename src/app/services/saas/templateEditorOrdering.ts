/** Preserve ordered SQL template identities and field metadata during edits. */
export function moveTemplateItem<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const next = index + direction;
  if (!Number.isInteger(index) || (direction !== -1 && direction !== 1)
    || index < 0 || next < 0 || next >= items.length) return items.slice();
  const copy = items.slice();
  [copy[index], copy[next]] = [copy[next], copy[index]];
  return copy;
}
