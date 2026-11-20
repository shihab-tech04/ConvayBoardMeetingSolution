/** AR-12 — build scoped, read-only Resolution Register filters from SQL-backed rows. */
export type ResolutionRegisterFilter = {
  key: string;
  label: string;
  type: "select" | "date";
  options?: string[];
};

const RESOLUTION_FIELDS = [
  { key: "source_meeting", label: "Source Meeting" },
  { key: "resolution_type", label: "Resolution Type" },
  { key: "approval_status", label: "Status" },
  { key: "vote_result", label: "Vote Result" },
] as const;

/**
 * Match GenPage's actual row-key equality and "All" reset semantics.
 * Never derive options from global meetings or placeholder rows: those could
 * disclose unrelated names or filter out valid permission-scoped resolutions.
 */
export function buildResolutionRegisterFilters(rows: readonly Record<string, unknown>[]): ResolutionRegisterFilter[] {
  const filters: ResolutionRegisterFilter[] = RESOLUTION_FIELDS.map(({ key, label }) => {
    const byNormalized = new Map<string, string>();
    for (const row of rows) {
      const value = typeof row[key] === "string" ? row[key].trim() : "";
      if (!value || value.toLocaleLowerCase() === "all") continue;
      const normalized = value.toLocaleLowerCase();
      if (!byNormalized.has(normalized)) byNormalized.set(normalized, value);
    }
    return {
      key, label, type: "select",
      options: ["All", ...Array.from(byNormalized.values()).sort((a, b) => a.localeCompare(b))],
    };
  });
  // GenPage compares these to effective_date when meeting_date is absent.
  filters.push({ key: "from", label: "From Date", type: "date" });
  filters.push({ key: "to", label: "To Date", type: "date" });
  return filters;
}
