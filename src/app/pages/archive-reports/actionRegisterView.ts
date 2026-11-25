/** AR-14 — scoped, read-only filters for an existing SQL-backed register. */
export type RegisterFilter = { key: string; label: string; type: "select" | "date"; options?: string[] };

const COLUMNS = [
  { key: "source_meeting", label: "Source Meeting" },
  { key: "assigned_to", label: "Assignee" },
  { key: "priority", label: "Priority" },
  { key: "implementation_status", label: "Implementation" },
] as const;

/** Options match the exact field values GenPage searches (case-insensitive equality).
 * Empty values are excluded, "All" matches GenPage's existing reset semantics.
 */
export function buildActionRegisterFilters(rows: readonly Record<string, unknown>[]): RegisterFilter[] {
  const filters: RegisterFilter[] = COLUMNS.map(({ key, label }) => {
    const byNormalized = new Map<string, string>();
    for (const row of rows) {
      const value = typeof row[key] === "string" ? (row[key] as string).trim() : "";
      if (!value || value.toLowerCase() === "all") continue;
      const normalized = value.toLocaleLowerCase();
      if (!byNormalized.has(normalized)) byNormalized.set(normalized, value);
    }
    return { key, label, type: "select", options: ["All", ...Array.from(byNormalized.values()).sort((a, b) => a.localeCompare(b))] };
  });
  filters.push({ key: "from", label: "From Date", type: "date" });
  filters.push({ key: "to", label: "To Date", type: "date" });
  return filters;
}

/** The data has already been scope-filtered by the authoritative SQL-backed registry.
 * Never merge these values with example rows or a global meeting list.
 */
export function todayInLocalTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isActionClosed(action: Record<string, unknown>): boolean {
  // Cancellation takes precedence over stale "Completed" or "Closed" fields.
  if (isActionCancelled(action)) return false;
  return [action.implementation_status, action.action_status, action.completion_status]
    .some(value => typeof value === "string" && ["completed", "closed"].includes(value.trim().toLowerCase()));
}

/** Cancellation is neither successful completion nor an active overdue obligation. */
export function isActionCancelled(action: Record<string, unknown>): boolean {
  return [action.implementation_status, action.action_status, action.approval_status, action.completion_status]
    .some(value => typeof value === "string" && ["cancelled", "canceled"].includes(value.trim().toLowerCase()));
}
export function isActionOpen(action: Record<string, unknown>): boolean {
  return !isActionClosed(action) && !isActionCancelled(action);
}

function isValidCivilDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

export function countOverdueActions(rows: readonly Record<string, unknown>[], today: string): number {
  // Impossible dates and malformed reference days are not evidence of overdue work.
  if (!isValidCivilDate(today)) return 0;
  return rows.filter(row => isValidCivilDate(row.due_date) &&
    row.due_date < today && isActionOpen(row)).length;
}
