/**
 * NI-15 continuation — project-backed, permission-scoped provider status reader.
 * No catalogue status is accepted as proof of connectivity.
 * Installation requires the controller-approved SQL read contract below.
 */
import { convayAuth } from "../../services/supabase/convayAuth";
import type { ConnectionReadState, IntegrationConnectionStatus } from "./integrationKpiSummary";

export interface ProviderStatusRow {
  provider_id: string;
  status: string;
  verified_at: string | null;
}

const ALLOWED_STATUSES = new Set<IntegrationConnectionStatus>([
  "Connected", "Disconnected", "Error", "Pending Setup",
]);
/** Controller may tune this only together with the provider health-probe schedule. */
export const MAX_CONNECTED_EVIDENCE_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Project server observations against the existing approved catalogue.
 *
 * A missing backend row means *not configured*, never connected. A stale or
 * missing successful probe never counts as connected. Malformed/unknown rows
 * fail the entire read closed instead of being silently ignored.
 */
export function normalizeProviderConnectionRead(
  catalogueIds: readonly string[],
  backendRows: unknown,
  nowMs: number,
  maxAgeMs = MAX_CONNECTED_EVIDENCE_AGE_MS,
): ConnectionReadState {
  if (!Array.isArray(backendRows) || !Number.isFinite(nowMs)
    || !Number.isFinite(maxAgeMs) || maxAgeMs <= 0) {
    return { state: "error", error: "Invalid provider status response" };
  }
  const known = new Set<string>();
  for (const id of catalogueIds) {
    if (typeof id !== "string" || !id.trim() || known.has(id)) {
      return { state: "error", error: "Invalid integration catalogue" };
    }
    known.add(id);
  }
  const seen = new Set<string>();
  const values = new Map<string, IntegrationConnectionStatus>();
  for (const row of backendRows) {
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      return { state: "error", error: "Invalid provider status row" };
    }
    const { provider_id, status, verified_at } = row as Record<string, unknown>;
    if (typeof provider_id !== "string" || !known.has(provider_id)
      || seen.has(provider_id) || !ALLOWED_STATUSES.has(status as IntegrationConnectionStatus)) {
      return { state: "error", error: "Unrecognized provider status" };
    }
    seen.add(provider_id);
    if (status === "Connected") {
      if (typeof verified_at !== "string" || !verified_at.trim()) {
        return { state: "error", error: "Connected state requires server verification" };
      }
      const timestamp = Date.parse(verified_at);
      if (!Number.isFinite(timestamp) || timestamp > nowMs) {
        return { state: "error", error: "Invalid provider verification timestamp" };
      }
      if (nowMs - timestamp > maxAgeMs) {
        // Connected is no longer proven; reflect verification problem, not success.
        values.set(provider_id, "Error");
        continue;
      }
    } else if (verified_at !== null && verified_at !== undefined
      && (typeof verified_at !== "string" || !Number.isFinite(Date.parse(verified_at)))) {
      return { state: "error", error: "Invalid provider timestamp" };
    }
    values.set(provider_id, status as IntegrationConnectionStatus);
  }
  return {
    state: "ready",
    records: catalogueIds.map(id => ({ id, status: values.get(id) ?? "Pending Setup" })),
  };
}

/**
 * A server-only writer publishes provider probe outcomes; this client is read-only.
 * PostgreSQL RLS limits SELECT to holders of existing admin_integrations grant.
 * Do not call this from an unverified / unauthorised route.
 */
export async function loadProviderConnectionRead(
  catalogueIds: readonly string[],
  nowMs = Date.now(),
): Promise<ConnectionReadState> {
  try {
    const response = await convayAuth.authenticatedRequest(
      "/rest/v1/convay_provider_connections?select=provider_id,status,verified_at&order=provider_id.asc",
      { method: "GET" },
    );
    const payload: unknown = await response.json();
    return normalizeProviderConnectionRead(catalogueIds, payload, nowMs);
  } catch (cause) {
    return {
      state: "error",
      error: cause instanceof Error ? cause.message : "Provider status could not be verified",
    };
  }
}
