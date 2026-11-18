/**
 * NI-15: Provider-state KPI projection.
 *
 * This function only summarizes a successful, authenticated provider-connection
 * read. It does not infer a connection from a static integration catalogue.
 * The controller must adapt the approved SQL/RLS-backed connection registry
 * before wiring this into IntegrationsPage (which is shared with NI-14).
 */
export type IntegrationConnectionStatus =
  | "Connected"
  | "Disconnected"
  | "Error"
  | "Pending Setup";

export interface IntegrationConnectionRecord {
  id: string;
  status: IntegrationConnectionStatus;
}

export type ConnectionReadState =
  | { state: "loading" }
  | { state: "error"; error?: string }
  | { state: "ready"; records: readonly IntegrationConnectionRecord[] };

export interface VerifiedConnectionCounts {
  total: number;
  connected: number;
  errors: number;
  pendingSetup: number;
  disconnected: number;
}

export type IntegrationKpiResult =
  | { state: "loading" }
  | { state: "error" }
  | { state: "ready"; counts: VerifiedConnectionCounts };

const STATUSES: readonly IntegrationConnectionStatus[] = [
  "Connected", "Disconnected", "Error", "Pending Setup",
];

/** Fail closed for unresolved reads and unrecognized/duplicated provider rows. */
export function summarizeIntegrationConnectionRead(
  read: ConnectionReadState,
): IntegrationKpiResult {
  if (read.state !== "ready") return { state: read.state };
  if (!Array.isArray(read.records)) return { state: "error" };

  const counts: VerifiedConnectionCounts = {
    total: 0,
    connected: 0,
    errors: 0,
    pendingSetup: 0,
    disconnected: 0,
  };
  const ids = new Set<string>();

  for (const record of read.records) {
    if (!record || typeof record.id !== "string" || !record.id.trim()
      || ids.has(record.id.trim()) || !STATUSES.includes(record.status)) {
      return { state: "error" };
    }
    ids.add(record.id.trim());
    counts.total += 1;
    switch (record.status) {
      case "Connected": counts.connected += 1; break;
      case "Disconnected": counts.disconnected += 1; break;
      case "Error": counts.errors += 1; break;
      case "Pending Setup": counts.pendingSetup += 1; break;
    }
  }
  return { state: "ready", counts };
}
