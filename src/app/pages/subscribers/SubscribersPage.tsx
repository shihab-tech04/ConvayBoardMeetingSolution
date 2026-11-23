import { useState } from "react";
import { useNavigate } from "react-router";
import { Building2, CreditCard, Users, CalendarDays, Settings2, ShieldCheck, ArrowRight } from "lucide-react";

/** First-draft platform control surface. Never invents billing, tenant or usage records. */
const capabilities = [
  { title: "Company onboarding", description: "Provision a company, appoint its administrator and invite verified members.", icon: Building2, status: "Backend integration pending" },
  { title: "Subscription builder", description: "Define base price, user seats, meeting capacity, storage and LiveKit usage allowances.", icon: CreditCard, status: "Pricing contract pending" },
  { title: "Company profile", description: "Review organization identity, membership, subscription, invoices and usage.", icon: Users, status: "Tenant-scoped readback pending" },
  { title: "Meeting types", description: "Create versioned company-specific meeting types with governance defaults.", icon: CalendarDays, status: "Authoritative registry pending" },
  { title: "Meeting workflows", description: "Configure reusable steps, fields, validation, approvals and review stages.", icon: Settings2, status: "Versioned workflow engine pending" },
  { title: "Access and billing controls", description: "Enforce SQL isolation, roles, quota limits, audit trails and billing reconciliation.", icon: ShieldCheck, status: "Security gates pending" },
];

export function SubscribersPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"overview" | "pricing" | "onboarding" | "templates">("overview");
  return (
    <main className="table-page" style={{ padding: "24px", maxWidth: 1320, margin: "0 auto" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Subscribers</h1>
          <p style={{ color: "var(--text-secondary, #64748b)", maxWidth: 720 }}>Company subscriptions, onboarding, meeting templates and billing configuration.</p>
        </div>
        <span style={{ border: "1px solid #d6a33d", borderRadius: 24, padding: "6px 12px", fontSize: 12 }}>First draft · No live billing</span>
      </div>
      <nav aria-label="Subscriber sections" style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "24px 0" }}>
        {(["overview", "pricing", "onboarding", "templates"] as const).map(item => (
          <button key={item} type="button" onClick={() => setTab(item)} aria-pressed={tab === item}
            style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid var(--border-color, #cbd5e1)", background: tab === item ? "var(--primary, #2458ac)" : "transparent", color: tab === item ? "white" : "inherit", cursor: "pointer", textTransform: "capitalize" }}>{item}</button>
        ))}
      </nav>
      {tab === "overview" && <section aria-label="Subscriber capabilities" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {capabilities.map(({ title, description, icon: Icon, status }) => <article key={title} style={{ border: "1px solid var(--border-color, #dce1e8)", borderRadius: 14, padding: 20 }}>
          <Icon size={22} aria-hidden="true" /><h2 style={{ fontSize: 17, fontWeight: 650, margin: "12px 0 8px" }}>{title}</h2>
          <p style={{ lineHeight: 1.55 }}>{description}</p><p style={{ marginTop: 16, fontSize: 12, opacity: .75 }}>{status}</p>
        </article>)}
      </section>}
      {tab === "pricing" && <section style={{ maxWidth: 850 }}>
        <h2 style={{ fontSize: 20, fontWeight: 650 }}>Subscription configuration</h2>
        <p style={{ margin: "10px 0 20px" }}>The production pricing engine will combine a base subscription with seat limits, meeting capacity, participant-minutes, recording, storage and optional services. Prices and entitlements must be sourced from authoritative SQL, not browser defaults.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {["Base subscription", "Member seats", "Meeting capacity", "LiveKit participant-minutes", "Recording and storage", "Additional services"].map(label => <div key={label} style={{ padding: 16, border: "1px solid var(--border-color, #dce1e8)", borderRadius: 12 }}><strong>{label}</strong><p style={{ marginTop: 8, fontSize: 13 }}>Not configured in SQL</p></div>)}
        </div>
      </section>}
      {tab === "onboarding" && <section style={{ maxWidth: 780 }}>
        <h2 style={{ fontSize: 20, fontWeight: 650 }}>Company onboarding</h2>
        <p style={{ margin: "12px 0" }}>Company registration → verified administrator → subscription entitlement → invitations → activated workspace. Tenant provisioning exists in SQL, but no company is provisioned yet. Creation is unavailable until end-to-end isolation and activation are verified.</p>
        <p role="status" style={{ padding: 14, border: "1px solid #d6a33d", borderRadius: 10 }}>No company has been created or charged by this draft.</p>
      </section>}
      {tab === "templates" && <section style={{ maxWidth: 780 }}>
        <h2 style={{ fontSize: 20, fontWeight: 650 }}>Meeting templates and dynamic creation</h2>
        <p style={{ margin: "12px 0" }}>The existing five-step meeting wizard remains unchanged. A future versioned template engine will assemble its existing participant, agenda, quorum and review components from tenant-scoped definitions.</p>
        <button type="button" onClick={() => navigate("/meetings/all-meetings")} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", border: "1px solid var(--border-color, #cbd5e1)", borderRadius: 10, cursor: "pointer" }}>Open existing meetings <ArrowRight size={16} /></button>
      </section>}
    </main>
  );
}
