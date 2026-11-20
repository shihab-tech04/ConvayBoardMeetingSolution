/** RP-03 — only actual, permission-scoped governance report dimensions. */
export type GovernanceFilter = {
  key: string;
  label: string;
  type: "select";
  options: string[];
};

const REPORT_DIMENSIONS = [
  { key: "body_type", label: "Body Type" },
  { key: "chairperson", label: "Chairperson" },
  { key: "status", label: "Status" },
] as const;

export function buildGovernanceReportFilters(rows: readonly Record<string, unknown>[]): GovernanceFilter[] {
  return REPORT_DIMENSIONS.map(({ key, label }) => {
    const seen = new Map<string, string>();
    for (const row of rows) {
      const value = typeof row[key] === "string" ? row[key].trim() : "";
      if (!value || value.toLocaleLowerCase() === "all") continue;
      const normalized = value.toLocaleLowerCase();
      if (!seen.has(normalized)) seen.set(normalized, value);
    }
    return { key, label, type: "select", options: ["All", ...Array.from(seen.values()).sort((a, b) => a.localeCompare(b))] };
  });
}
