/** Normalize URL pagination against the filtered document-result count. */
export function normalizeDocumentPage(
  rawPage: string | null,
  resultCount: number,
  pageSize = 10,
): number {
  const text = (rawPage ?? "1").trim();
  if (!/^\d+$/.test(text)) return 1;
  const requested = Number(text);
  if (!Number.isSafeInteger(requested) || requested < 1) return 1;
  const count = Number.isFinite(resultCount) ? Math.max(0, Math.floor(resultCount)) : 0;
  const size = Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : 10;
  return Math.min(requested, Math.max(1, Math.ceil(count / size)));
}
