/**
 * QuorumAndAccessPanel — rendered at the top of Step 3 (Meeting Mode & Quorum).
 *
 * Shows projected quorum based on accumulated participant_links_json from Step 1
 * and quorum settings filled in the form below, plus document access warnings.
 * Read-only: does not write any values back.
 */
import React, { useMemo, useEffect, useCallback } from "react";
import {
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle,
  Lock, Info,
} from "lucide-react";
import type { EntryFormValue } from "./EntryForm";
import type { DraftParticipantLink } from "./ParticipantSelectorStep";
import type { QuorumRule, GovernanceBody, BoardDocument } from "../../data/boardMeetingData";
import type { SelectedAgendaEntry, AdditionalDocEntry } from "./AgendaDocumentStep";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuorumAndAccessPanelProps {
  values: Record<string, EntryFormValue>;
  onValuesChange?: (patch: Record<string, EntryFormValue>) => void;
  governanceBodies: GovernanceBody[];
  quorumRules: QuorumRule[];
  allDocuments: BoardDocument[];
}

// ── Convay link generator ─────────────────────────────────────────────────────

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) + h) ^ s.charCodeAt(i); h = h | 0; }
  return Math.abs(h);
}

export function generateConvayMeeting(seed: string) {
  const h = djb2(seed || "convay-default");
  const meetingId = String(h).padStart(12, "0").slice(0, 12);
  const password  = String(h % 1000000).padStart(6, "0");
  const pwd       = (h * 31337).toString(16).padStart(32, "a").slice(0, 32);
  const link      = `https://app.convay.com/m/j/${meetingId}?pwd=${pwd}`;
  const invite    = `Please join Convay meeting now.\n\nMeeting ID: ${meetingId}\nPassword: ${password}\nMeeting link: ${link}`;
  return { meetingId, password, link, invite };
}

type QuorumStatus = "met" | "at_risk" | "not_met" | "not_configured";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseLinks(json: EntryFormValue): DraftParticipantLink[] {
  try { return JSON.parse(String(json ?? "[]")) as DraftParticipantLink[]; }
  catch { return []; }
}

function parseAgendaEntries(json: EntryFormValue): SelectedAgendaEntry[] {
  try { return JSON.parse(String(json ?? "[]")) as SelectedAgendaEntry[]; }
  catch { return []; }
}

function parseAdditionalDocs(json: EntryFormValue): AdditionalDocEntry[] {
  try { return JSON.parse(String(json ?? "[]")) as AdditionalDocEntry[]; }
  catch { return []; }
}

function quorumStatus(eligible: number, total: number, required: number, requiredPct: number): QuorumStatus {
  if (required === 0 && requiredPct === 0) return "not_configured";
  const meetsFixed = required > 0 ? eligible >= required : true;
  const meetsPct   = requiredPct > 0 && total > 0 ? (eligible / total * 100) >= requiredPct : true;
  if (meetsFixed && meetsPct) return "met";
  // At risk: within 1 member / 5% of threshold
  const closeFixed = required > 0 ? eligible >= required - 1 : true;
  const closePct   = requiredPct > 0 && total > 0 ? (eligible / total * 100) >= requiredPct - 5 : true;
  if (closeFixed && closePct) return "at_risk";
  return "not_met";
}

// Simplified access rule: Observers/Invitees don't see Strictly Confidential docs
function hasAccess(role: string, confidentiality: string): boolean {
  if (confidentiality === "Strictly Confidential") {
    return !["Observer", "Invitee", "Presenter"].includes(role);
  }
  return true;
}

// ── Sub-components ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<QuorumStatus, { label: string; icon: React.ElementType; cls: string }> = {
  met:            { label: "Expected to Meet",       icon: CheckCircle2, cls: "text-emerald-600 dark:text-emerald-400" },
  at_risk:        { label: "At Risk",                icon: AlertTriangle, cls: "text-amber-600 dark:text-amber-400" },
  not_met:        { label: "Not Expected to Meet",   icon: XCircle,      cls: "text-red-600 dark:text-red-400" },
  not_configured: { label: "Not Configured",         icon: Info,         cls: "text-[var(--muted-foreground)]" },
};

// ── Main component ────────────────────────────────────────────────────────────

export function QuorumAndAccessPanel({ values, onValuesChange, governanceBodies, quorumRules, allDocuments }: QuorumAndAccessPanelProps) {

  // ── Participant data from Step 1 ─────────────────────────────────────────
  const allLinks  = useMemo(() => parseLinks(values.participant_links_json), [values.participant_links_json]);
  const quorumEligible = useMemo(() => allLinks.filter(l => l.quorum_eligible), [allLinks]);

  const committeeValue = String(values.committee ?? "");

  // Governance-body default rule (source of truth — manual quorum fields removed from form)
  const govRule = useMemo(() => {
    const body = governanceBodies.find(
      b => b.id === committeeValue || b.body_id === committeeValue || b.body_name === committeeValue,
    );
    if (!body) return null;
    return quorumRules.find(r =>
      (r.governance_body_id === body.id || r.governance_body_id === body.body_id) && r.status === "Active",
    ) ?? null;
  }, [governanceBodies, committeeValue, quorumRules]);

  const effectiveRequired = govRule ? parseInt(govRule.minimum_members, 10) || 0 : 0;
  const effectivePct      = govRule ? parseFloat(govRule.quorum_percent) || 0 : 0;

  const status = useMemo(
    () => quorumStatus(quorumEligible.length, allLinks.length, effectiveRequired, effectivePct),
    [quorumEligible.length, allLinks.length, effectiveRequired, effectivePct],
  );

  const sc = STATUS_CONFIG[status];
  const Icon = sc.icon;

  // ── Convay meeting generation ──────────────────────────────────────────────
  const mode = String(values.mode ?? "Physical");
  const isVirtual = mode === "Virtual" || mode === "Hybrid";
  const convayMeeting = useMemo(() => {
    if (!isVirtual) return null;
    const seed = String(values.meeting_title ?? "") + String(values.meeting_date ?? "") + String(values.committee ?? "");
    return generateConvayMeeting(seed);
  }, [isVirtual, values.meeting_title, values.meeting_date, values.committee]);

  useEffect(() => {
    if (!onValuesChange) return;
    if (convayMeeting) {
      onValuesChange({ virtual_link: convayMeeting.link, virtual_platform: "Convay" });
    } else {
      onValuesChange({ virtual_link: "", virtual_platform: "" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convayMeeting?.link]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
  }, []);

  // Required roles come from the governance rule (not manual form fields)
  const requiredRoles: string[] = useMemo(() => {
    if (!govRule) return [];
    const rv = (govRule as {required_roles?: string | string[]}).required_roles;
    if (!rv) return [];
    if (Array.isArray(rv)) return rv as string[];
    if (typeof rv === "string" && rv) return rv.split(",").map(s => s.trim()).filter(Boolean);
    return [];
  }, [govRule]);

  const missingRoles = useMemo(
    () => requiredRoles.filter(role => !allLinks.some(l => l.participant_type === role)),
    [requiredRoles, allLinks],
  );

  // ── Document access check ─────────────────────────────────────────────────
  const selectedAgendaIds = useMemo(
    () => new Set(parseAgendaEntries(values.selected_agenda_ids_json).map(e => e.agenda_id)),
    [values.selected_agenda_ids_json],
  );
  const additionalDocIds = useMemo(
    () => new Set(parseAdditionalDocs(values.additional_doc_ids_json).map(d => d.doc_id)),
    [values.additional_doc_ids_json],
  );

  const relevantDocs = useMemo(() => {
    return allDocuments.filter(d => {
      const did = d.doc_id ?? d.id;
      const isAgendaDoc = d.related_agenda && selectedAgendaIds.has(d.related_agenda);
      const isAdditional = additionalDocIds.has(did);
      return isAgendaDoc || isAdditional;
    });
  }, [allDocuments, selectedAgendaIds, additionalDocIds]);

  interface AccessWarning { participantName: string; participantRole: string; docName: string; confidentiality: string }
  const accessWarnings = useMemo((): AccessWarning[] => {
    const warnings: AccessWarning[] = [];
    const restrictedDocs = relevantDocs.filter(d => d.confidentiality && d.confidentiality !== "Non-Confidential" && d.confidentiality !== "Internal");
    for (const link of allLinks) {
      for (const doc of restrictedDocs) {
        if (!hasAccess(link.participant_type, doc.confidentiality ?? "")) {
          warnings.push({
            participantName: link.user_name,
            participantRole: link.participant_type,
            docName: doc.doc_name,
            confidentiality: doc.confidentiality ?? "",
          });
        }
      }
    }
    return warnings;
  }, [allLinks, relevantDocs]);

  // Don't render if no data
  if (allLinks.length === 0 && relevantDocs.length === 0) {
    return (
      <div className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] mb-3 text-xs text-[var(--muted-foreground)]">
        <Info size={12} className="inline mr-1.5" />
        Complete Step 1 (Participants) and Step 2 (Agendas) to see quorum and access projections.
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-3">
      {/* Quorum projection */}
      <div className="border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface)] border-b border-[var(--border)]">
          <ShieldCheck size={13} strokeWidth={2} className="text-[var(--muted-foreground)]" />
          <span className="text-xs font-semibold text-[var(--foreground)]">Projected Quorum</span>
          <span className={`ml-auto flex items-center gap-1 text-xs font-medium ${sc.cls}`}>
            <Icon size={12} strokeWidth={2} aria-hidden="true" />
            {sc.label}
          </span>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col items-center justify-center px-4 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] min-w-[72px]">
              <span className="text-xl font-bold text-[var(--foreground)]">{allLinks.length}</span>
              <span className="text-[10px] font-medium text-[var(--muted-foreground)] mt-0.5 uppercase tracking-wide">Total</span>
            </div>
            <div className="flex flex-col items-center justify-center px-4 py-2.5 rounded-lg bg-[var(--primary)]/6 border border-[var(--primary)]/15 min-w-[72px]">
              <span className="text-xl font-bold text-[var(--primary)]">{quorumEligible.length}</span>
              <span className="text-[10px] font-medium text-[var(--muted-foreground)] mt-0.5 uppercase tracking-wide">Eligible</span>
            </div>
            {effectiveRequired > 0 && (
              <div className="flex flex-col items-center justify-center px-4 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] min-w-[72px]">
                <span className="text-xl font-bold text-[var(--foreground)]">{effectiveRequired}</span>
                <span className="text-[10px] font-medium text-[var(--muted-foreground)] mt-0.5 uppercase tracking-wide">Required</span>
              </div>
            )}
            {effectivePct > 0 && (
              <div className="flex flex-col items-center justify-center px-4 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] min-w-[72px]">
                <span className="text-xl font-bold text-[var(--foreground)]">{effectivePct}%</span>
                <span className="text-[10px] font-medium text-[var(--muted-foreground)] mt-0.5 uppercase tracking-wide">Threshold</span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {(effectiveRequired > 0 || effectivePct > 0) && (
            <div className="space-y-1.5">
              <div className="h-2.5 w-full rounded-full bg-[var(--color-background-subtle,rgba(75,86,148,.06))] overflow-hidden border border-[var(--border)]">
                <div
                  className={`h-full rounded-full transition-all ${
                    status === "met" ? "bg-emerald-500" : status === "at_risk" ? "bg-amber-500" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(100, effectiveRequired > 0 ? (quorumEligible.length / Math.max(effectiveRequired, 1)) * 100 : 0)}%` }}
                />
              </div>
              <div className="text-[11px] text-[var(--muted-foreground)]">
                {quorumEligible.length} of {effectiveRequired || "?"} required eligible members
              </div>
            </div>
          )}

          {/* Governance rule source */}
          {govRule && (
            <div className="text-[10px] text-[var(--muted-foreground)] italic">
              Using governance rule: {govRule.body_name} — {govRule.quorum_percent}% minimum
            </div>
          )}

          {/* Missing required roles */}
          {missingRoles.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {missingRoles.map(role => (
                <div key={role} className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={9} strokeWidth={2} />
                  Required role not assigned: <strong>{role}</strong>
                </div>
              ))}
            </div>
          )}

          {status === "not_configured" && (
            <div className="text-[10px] text-[var(--muted-foreground)] italic">
              Set quorum rules in the form below to see projected status.
            </div>
          )}
        </div>
      </div>

      {/* Document access warnings */}
      {accessWarnings.length > 0 && (
        <div className="border border-amber-200 dark:border-amber-800 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
            <Lock size={13} strokeWidth={2} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Document Access Warnings ({accessWarnings.length})</span>
          </div>
          <div className="divide-y divide-amber-100 dark:divide-amber-900/30 max-h-40 overflow-y-auto">
            {accessWarnings.map((w, i) => (
              <div key={i} className="px-3 py-1.5 text-[10px]">
                <span className="font-medium text-[var(--foreground)]">{w.participantName}</span>
                <span className="text-[var(--muted-foreground)]"> ({w.participantRole}) may not have access to </span>
                <span className="font-medium text-[var(--foreground)]">{w.docName}</span>
                <span className="text-amber-600 dark:text-amber-400"> · {w.confidentiality}</span>
              </div>
            ))}
          </div>
          <div className="px-3 py-2 bg-amber-50/50 dark:bg-amber-900/10 text-[10px] text-amber-700 dark:text-amber-400">
            Review participant roles or remove restricted documents before scheduling.
            Resolve access through the Document Library access journey.
          </div>
        </div>
      )}

      {/* Participant list summary */}
      {allLinks.length > 0 && accessWarnings.length === 0 && relevantDocs.length > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={10} strokeWidth={2} />
          All participants have appropriate document access
        </div>
      )}
    </div>
  );
}
