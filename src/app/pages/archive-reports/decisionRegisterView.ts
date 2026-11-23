/** AR-13 — scoped, read-only filters for an existing SQL-backed register. */
export type RegisterFilter = { key: string; label: string; type: "select" | "date"; options?: string[] };

const COLUMNS = [
  { key: "source_meeting", label: "Source Meeting" },
  { key: "decision_owner", label: "Owner" },
  { key: "implementation_status", label: "Implementation" },
  { key: "approval_status", label: "Status" },
] as const;

/** Options match the exact field values GenPage searches (case-insensitive equality).
 * Empty values are excluded, "All" matches GenPage's existing reset semantics.
 */
export function buildDecisionRegisterFilters(rows: readonly Record<string, unknown>[]): RegisterFilter[] {
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
