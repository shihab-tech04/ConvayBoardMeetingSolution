/** AR-04: A failed or unresolved authoritative registry read must never be labelled empty. */
export type RecordListState = "loading" | "error" | "empty" | "ready";
export function recordListState(loading: boolean, error: unknown, count: number): RecordListState {
  // Fail closed: even a previously cached snapshot is not a verified read after a failed request.
  if (error) return "error";
  if (loading) return "loading";
  if (!Number.isSafeInteger(count) || count < 0) return "error";
  return count === 0 ? "empty" : "ready";
}
