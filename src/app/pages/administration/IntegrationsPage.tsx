/**
 * Integrations page — card-based overview of available integrations.
 * Uses only existing CSS tokens, Tailwind, and Lucide icons.
 * No new business logic — display only.
 */
import { useState } from "react";
import {
  Link2, Mail, MessageSquare, Calendar, Cloud, Database, Shield,
  CheckCircle, XCircle, RefreshCw, Settings, ExternalLink, AlertTriangle,
  Zap, FileText, Video, Users,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type IntegrationStatus = "Connected" | "Disconnected" | "Error" | "Pending Setup";

interface Integration {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: React.ElementType;
  status: IntegrationStatus;
  lastSync?: string;
  features: string[];
  provider?: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const INTEGRATIONS: Integration[] = [
  {
    id: "smtp-email",
    name: "SMTP Email Server",
    category: "Communication",
    description: "Send meeting invitations, notifications, and governance communications via your organisation's email server.",
    icon: Mail,
    status: "Connected",
    lastSync: "2026-01-28 09:15 AM",
    features: ["Meeting invitations", "RSVP reminders", "Minutes distribution", "Approval notifications"],
    provider: "Custom SMTP",
  },
  {
    id: "ms-teams",
    name: "Microsoft Teams",
    category: "Communication",
    description: "Integrate with Microsoft Teams for virtual meeting hosting, calendar sync, and notification delivery.",
    icon: MessageSquare,
    status: "Disconnected",
    features: ["Virtual meeting hosting", "Calendar sync", "Meeting reminders", "File sharing"],
    provider: "Microsoft",
  },
  {
    id: "ms-calendar",
    name: "Microsoft Outlook Calendar",
    category: "Calendar",
    description: "Sync board and committee meetings directly to Outlook calendar for all participants.",
    icon: Calendar,
    status: "Connected",
    lastSync: "2026-01-28 08:00 AM",
    features: ["Calendar sync", "Meeting invites", "Reminder notifications", "Attendee management"],
    provider: "Microsoft",
  },
  {
    id: "google-workspace",
    name: "Google Workspace",
    category: "Calendar",
    description: "Sync meetings and documents with Google Calendar and Google Drive for remote participants.",
    icon: Cloud,
    status: "Pending Setup",
    features: ["Google Calendar sync", "Drive document access", "Gmail notifications", "Meet integration"],
    provider: "Google",
  },
  {
    id: "zoom",
    name: "Zoom",
    category: "Video Conferencing",
    description: "Host hybrid board meetings with Zoom integration for remote participants and recording.",
    icon: Video,
    status: "Connected",
    lastSync: "2026-01-28 10:30 AM",
    features: ["Virtual meeting hosting", "Recording storage", "Participant management", "Breakout rooms"],
    provider: "Zoom Video Communications",
  },
  {
    id: "active-directory",
    name: "Active Directory / LDAP",
    category: "Identity",
    description: "Synchronise user accounts and group memberships from your organisation's directory service.",
    icon: Users,
    status: "Connected",
    lastSync: "2026-01-28 06:00 AM",
    features: ["User sync", "Group sync", "Single sign-on", "Role mapping"],
    provider: "Microsoft AD",
  },
  {
    id: "document-storage",
    name: "SharePoint / OneDrive",
    category: "Document Storage",
    description: "Store and retrieve board papers, minutes, and governance documents from SharePoint or OneDrive.",
    icon: FileText,
    status: "Connected",
    lastSync: "2026-01-28 09:45 AM",
    features: ["Document storage", "Version control", "Access control", "Search integration"],
    provider: "Microsoft",
  },
  {
    id: "sms-gateway",
    name: "SMS Gateway",
    category: "Communication",
    description: "Send SMS notifications for meeting reminders and urgent alerts to board members.",
    icon: Zap,
    status: "Error",
    lastSync: "2026-01-26 11:00 AM",
    features: ["SMS notifications", "Meeting reminders", "Quorum alerts", "Bulk messaging"],
    provider: "Twilio",
  },
  {
    id: "audit-siem",
    name: "SIEM / Audit Log Export",
    category: "Security",
    description: "Export governance audit logs to your Security Information and Event Management (SIEM) system.",
    icon: Shield,
    status: "Pending Setup",
    features: ["Real-time log export", "Compliance reporting", "Event correlation", "Alert forwarding"],
    provider: "Custom / Splunk",
  },
  {
    id: "erp-connector",
    name: "ERP / Core Banking",
    category: "Enterprise",
    description: "Connect with core banking or ERP systems for financial resolution and budget impact tracking.",
    icon: Database,
    status: "Disconnected",
    features: ["Financial data sync", "Budget tracking", "Resolution execution", "Audit trail"],
    provider: "Custom API",
  },
];

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<IntegrationStatus, { color: string; bg: string; border: string; icon: React.ElementType; label: string }> = {
  Connected:       { color: "#22c55e", bg: "#14532d22", border: "#22c55e44", icon: CheckCircle,    label: "Connected" },
  Disconnected:    { color: "#94a3b8", bg: "#94a3b822", border: "#94a3b844", icon: XCircle,        label: "Disconnected" },
  Error:           { color: "#ef4444", bg: "#7f1d1d22", border: "#ef444444", icon: AlertTriangle,  label: "Error" },
  "Pending Setup": { color: "#f59e0b", bg: "#78350f22", border: "#f59e0b44", icon: Settings,       label: "Pending Setup" },
};

const CATEGORIES = ["All", "Communication", "Calendar", "Video Conferencing", "Identity", "Document Storage", "Security", "Enterprise"];

// ─── Component ────────────────────────────────────────────────────────────────

export function IntegrationsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = INTEGRATIONS.filter(itg => {
    const matchesCategory = activeCategory === "All" || itg.category === activeCategory;
    const q = search.toLowerCase();
    const matchesSearch = !q
      || itg.name.toLowerCase().includes(q)
      || itg.description.toLowerCase().includes(q)
      || itg.category.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const connected    = INTEGRATIONS.filter(i => i.status === "Connected").length;
  const errors       = INTEGRATIONS.filter(i => i.status === "Error").length;
  const pending      = INTEGRATIONS.filter(i => i.status === "Pending Setup").length;
  const disconnected = INTEGRATIONS.filter(i => i.status === "Disconnected").length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div style={{ padding: "1.5rem 2rem 0", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.25rem" }}>Integrations</h1>
        <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", margin: "0 0 1.25rem" }}>
          Connect your Board Meeting System with external platforms, calendars, communication tools, and enterprise systems.
        </p>

        {/* KPI strip */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          {[
            { label: "Total Integrations", value: INTEGRATIONS.length, color: "var(--foreground)" },
            { label: "Connected",           value: connected,           color: "#22c55e" },
            { label: "Errors",              value: errors,              color: "#ef4444" },
            { label: "Pending Setup",       value: pending,             color: "#f59e0b" },
            { label: "Disconnected",        value: disconnected,        color: "#94a3b8" },
          ].map(kpi => (
            <div key={kpi.label} style={{ padding: "0.5rem 1rem", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 120 }}>
              <span style={{ fontSize: "1.35rem", fontWeight: 700, color: kpi.color, lineHeight: 1 }}>{kpi.value}</span>
              <span style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginTop: "0.2rem" }}>{kpi.label}</span>
            </div>
          ))}
        </div>

        {/* Category filter tabs */}
        <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: "0.55rem 0.85rem",
                fontSize: "0.78rem",
                fontWeight: activeCategory === cat ? 700 : 500,
                color: activeCategory === cat ? "var(--primary)" : "var(--muted-foreground)",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${activeCategory === cat ? "var(--primary)" : "transparent"}`,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search + grid ────────────────────────────────────────────────────── */}
      <div style={{ padding: "1.5rem 2rem" }}>
        {/* Search */}
        <div style={{ marginBottom: "1.25rem", maxWidth: 400 }}>
          <input
            type="text"
            placeholder="Search integrations…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--foreground)",
              fontSize: "0.85rem",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Cards grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--muted-foreground)" }}>
            <Link2 size={40} style={{ margin: "0 auto 1rem", opacity: 0.35, display: "block" }} />
            <p style={{ fontSize: "0.95rem" }}>No integrations match your search.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
            {filtered.map(itg => {
              const s = STATUS_CONFIG[itg.status];
              const Icon = itg.icon;
              const StatusIcon = s.icon;
              return (
                <div
                  key={itg.id}
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                    transition: "box-shadow 0.15s",
                  }}
                >
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={22} style={{ color: "var(--primary)" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.1rem" }}>
                        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{itg.name}</h3>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ fontSize: "0.68rem", padding: "0.15rem 0.45rem", borderRadius: 9999, background: "var(--muted)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
                          {itg.category}
                        </span>
                        {itg.provider && (
                          <span style={{ fontSize: "0.68rem", color: "var(--muted-foreground)" }}>{itg.provider}</span>
                        )}
                      </div>
                    </div>
                    {/* Status badge */}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.2rem 0.55rem", borderRadius: 9999, background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontSize: "0.68rem", fontWeight: 700, flexShrink: 0 }}>
                      <StatusIcon size={11} />
                      {s.label}
                    </span>
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", margin: 0, lineHeight: 1.5 }}>{itg.description}</p>

                  {/* Features */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                    {itg.features.map(f => (
                      <span key={f} style={{ fontSize: "0.68rem", padding: "0.15rem 0.45rem", borderRadius: 6, background: "var(--muted)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
                        {f}
                      </span>
                    ))}
                  </div>

                  {/* Last sync */}
                  {itg.lastSync && (
                    <p style={{ fontSize: "0.7rem", color: "var(--muted-foreground)", margin: 0 }}>
                      Last synced: {itg.lastSync}
                    </p>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid var(--border)", paddingTop: "0.75rem", marginTop: "auto" }}>
                    {itg.status === "Connected" && (
                      <>
                        <button
                          type="button"
                          onClick={() => {}}
                          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", padding: "0.4rem 0.6rem", borderRadius: 7, background: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                        >
                          <RefreshCw size={13} /> Sync Now
                        </button>
                        <button
                          type="button"
                          onClick={() => {}}
                          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", padding: "0.4rem 0.6rem", borderRadius: 7, background: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                        >
                          <Settings size={13} /> Configure
                        </button>
                      </>
                    )}
                    {itg.status === "Disconnected" && (
                      <button
                        type="button"
                        onClick={() => {}}
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", padding: "0.4rem 0.6rem", borderRadius: 7, background: "var(--primary)", border: "none", color: "#fff", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                      >
                        <Link2 size={13} /> Connect
                      </button>
                    )}
                    {itg.status === "Error" && (
                      <>
                        <button
                          type="button"
                          onClick={() => {}}
                          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", padding: "0.4rem 0.6rem", borderRadius: 7, background: "#7f1d1d22", border: "1px solid #ef444444", color: "#ef4444", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                        >
                          <RefreshCw size={13} /> Retry
                        </button>
                        <button
                          type="button"
                          onClick={() => {}}
                          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", padding: "0.4rem 0.6rem", borderRadius: 7, background: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                        >
                          <Settings size={13} /> Diagnose
                        </button>
                      </>
                    )}
                    {itg.status === "Pending Setup" && (
                      <button
                        type="button"
                        onClick={() => {}}
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", padding: "0.4rem 0.6rem", borderRadius: 7, background: "#78350f22", border: "1px solid #f59e0b44", color: "#f59e0b", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                      >
                        <Settings size={13} /> Setup Integration
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {}}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0.4rem 0.6rem", borderRadius: 7, background: "var(--muted)", border: "1px solid var(--border)", color: "var(--muted-foreground)", fontSize: "0.75rem", cursor: "pointer" }}
                      title="View documentation"
                    >
                      <ExternalLink size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
