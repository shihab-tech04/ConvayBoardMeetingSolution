/**
 * NI-15: display only server-verified integration connection counts.
 *
 * This is deliberately provider-agnostic. A controller-owned, authenticated,
 * role-scoped registry must supply `read`; never pass the static catalogue
 * in IntegrationsPage as though its example states are live connections.
 */
import { summarizeIntegrationConnectionRead } from "./integrationKpiSummary";
import type { ConnectionReadState } from "./integrationKpiSummary";

export interface VerifiedIntegrationKpisProps {
  read: ConnectionReadState;
  onRetry?: () => void;
}

const COLORS = {
  total: "var(--foreground)",
  connected: "#22c55e",
  errors: "#ef4444",
  pendingSetup: "#f59e0b",
  disconnected: "#94a3b8",
} as const;

export function VerifiedIntegrationKpis({ read, onRetry }: VerifiedIntegrationKpisProps) {
  const result = summarizeIntegrationConnectionRead(read);

  if (result.state === "loading") {
    return <div role="status" aria-live="polite" style={{ marginBottom: "1rem", color: "var(--muted-foreground)" }}>
      Loading integration connection status…
    </div>;
  }
  if (result.state === "error") {
    return <div role="alert" style={{ marginBottom: "1rem", color: "var(--muted-foreground)" }}>
      Integration connection status is unavailable.
      {onRetry && <button type="button" onClick={onRetry} style={{ marginLeft: "0.75rem", color: "var(--primary)", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>Retry</button>}
    </div>;
  }

  const { counts } = result;
  const kpis = [
    { label: "Total Integrations", value: counts.total, color: COLORS.total },
    { label: "Connected", value: counts.connected, color: COLORS.connected },
    { label: "Errors", value: counts.errors, color: COLORS.errors },
    { label: "Pending Setup", value: counts.pendingSetup, color: COLORS.pendingSetup },
    { label: "Disconnected", value: counts.disconnected, color: COLORS.disconnected },
  ];
  return <section aria-label="Verified integration connection counts" style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
    {kpis.map(kpi => <div key={kpi.label} style={{ padding: "0.5rem 1rem", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 120 }}>
      <span style={{ fontSize: "1.35rem", fontWeight: 700, color: kpi.color, lineHeight: 1 }}>{kpi.value}</span>
      <span style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "0.2rem" }}>{kpi.label}</span>
    </div>)}
  </section>;
}
