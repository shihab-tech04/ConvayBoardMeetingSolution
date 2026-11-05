import type { FilterDef, TableRow } from "../modulePageUtils";

/** MT-01: only options actually present in the authoritative meeting register. */
export function buildMeetingRegisterFilters(rows: readonly TableRow[]): FilterDef[] {
  const distinct = (key: string): string[] => Array.from(
    new Set(rows.map(row => String(row[key] ?? "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
  return [
    { key: "meeting_type", label: "Meeting Type", labelKey: "labels.meetingType", type: "select", options: ["All", ...distinct("meeting_type")], optionKeys: { All: "options.allTypes" } },
    { key: "committee", label: "Committee", labelKey: "labels.committee", type: "select", options: ["All", ...distinct("committee")], optionKeys: { All: "options.allCommittees" } },
    { key: "meeting_year", label: "Meeting Year", labelKey: "labels.meetingYear", type: "select", options: ["All", ...distinct("meeting_year").sort((a, b) => b.localeCompare(a))], optionKeys: { All: "options.allYears" } },
    { key: "from", label: "From Date", labelKey: "labels.fromDate", type: "date" },
    { key: "to", label: "To Date", labelKey: "labels.toDate", type: "date" },
  ];
}

/** True empty results only after the SQL-backed registries have all resolved. */
export interface MeetingRegistrySource {
  loading?: boolean;
  error?: string | null;
  refresh?: () => Promise<void>;
}
export function meetingRegisterSourceState(sources: readonly MeetingRegistrySource[]): {
  dataLoading: boolean;
  dataError: string | null;
} {
  const dataError = sources.map(source => source.error?.trim() || null).find(Boolean) ?? null;
  return { dataLoading: !dataError && sources.some(source => Boolean(source.loading)), dataError };
}
