/**
 * AgendaDocumentStep — Step 2 custom renderer.
 *
 * Lets users select approved L1 parent agendas from the canonical Agenda registry,
 * reorder them, and pick additional documents from the Document Library.
 * Writes to values.selected_agenda_ids_json and values.additional_doc_ids_json.
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Search, ChevronUp, ChevronDown, X, Eye, FileText,
  Plus, Clock, AlertTriangle, CheckCircle2, BookOpen, Files,
} from "lucide-react";
import type { AgendaSubmission, AgendaDocumentLink, BoardDocument } from "../../data/boardMeetingData";
import type { EntryFormValue } from "./EntryForm";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SelectedAgendaEntry {
  agenda_id: string;
  display_order: number;
}

export interface AdditionalDocEntry {
  doc_id: string;
  version: string;
  source_label: string;
}

export interface AgendaDocumentStepProps {
  values: Record<string, EntryFormValue>;
  onValuesChange: (patch: Record<string, EntryFormValue>) => void;
  allAgendas: AgendaSubmission[];
  agendaDocLinks: AgendaDocumentLink[];   // AgendaDocumentLink items
  allDocuments: BoardDocument[];
  existingMeetingAgendaLinks: string[];   // already linked agenda IDs (for edit mode)
  canManage: boolean;
  onRequestDocumentComposer: (onCreated: (docId: string) => void) => void;
  /** Optional callback to open the AgendaFormModal so users can create a new agenda inline. */
  onRequestAgendaComposer?: (onSaved: (result: { agendaId: string; status: string }) => void) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDurationMin(raw: string | undefined): number {
  if (!raw) return 0;
  const n = parseInt(String(raw).replace(/\D/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

function formatMinutes(min: number): string {
  if (min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

function parseTimeToMin(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function isEligibleParent(
  agenda: AgendaSubmission,
  alreadySelectedIds: Set<string>,
  existingLinkedIds: string[],
): boolean {
  const aid = agenda.agenda_id ?? agenda.id;
  // Must be an L1 parent
  if (agenda.parent_agenda_id != null) return false;
  // Not archived
  if (agenda.archived_at) return false;
  // Not already in selection or already linked
  if (alreadySelectedIds.has(aid)) return false;
  if (existingLinkedIds.includes(aid)) return false;
  return true;
}

function agendaReadinessLabel(agenda: AgendaSubmission, allAgendas: AgendaSubmission[]): {
  label: string; color: string; schedulingBlocked: boolean;
} {
  const aid = agenda.agenda_id ?? agenda.id;
  const status = agenda.approval_status ?? "Draft";
  if (status !== "Approved") {
    return { label: status, color: "amber", schedulingBlocked: true };
  }
  // Approved: check children
  const children = allAgendas.filter(a => a.parent_agenda_id === aid && !a.archived_at);
  const hasBlockingChild = children.some(c => c.approval_status !== "Approved");
  if (hasBlockingChild) {
    return { label: "Partially Approved", color: "amber", schedulingBlocked: true };
  }
  // Check Meeting Readiness
  const mr = (agenda as { meeting_readiness?: string }).meeting_readiness;
  if (mr && mr !== "Meeting Ready") {
    return { label: `Approved — ${mr}`, color: "amber", schedulingBlocked: true };
  }
  return { label: "Approved ✓ Meeting Ready", color: "emerald", schedulingBlocked: false };
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface DurationBannerProps {
  scheduledMin: number;
  agendaMin: number;
}
function DurationBanner({ scheduledMin, agendaMin }: DurationBannerProps) {
  if (scheduledMin <= 0 && agendaMin <= 0) return null;
  const diff = scheduledMin - agendaMin;
  const overrun = diff < 0;
  const exact   = diff === 0;
  const statusText = overrun ? `${formatMinutes(-diff)} over scheduled time` : exact ? "Exact fit" : `${formatMinutes(diff)} remaining`;
  const statusColor = overrun ? "text-red-600 dark:text-red-400" : exact ? "text-amber-600 dark:text-amber-500" : "text-emerald-600 dark:text-emerald-400";

  return (
    <div className={`rounded-xl border mb-4 overflow-hidden
      ${overrun
        ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
        : exact
          ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
          : "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800"}`}>
      <div className="flex items-stretch divide-x divide-current/10">
        <div className="flex flex-col items-center justify-center px-5 py-3 min-w-[88px]">
          <span className="text-lg font-bold text-[var(--foreground)]">{formatMinutes(scheduledMin)}</span>
          <span className="text-[10px] font-medium text-[var(--muted-foreground)] mt-0.5 uppercase tracking-wide">Scheduled</span>
        </div>
        <div className="flex flex-col items-center justify-center px-5 py-3 min-w-[88px]">
          <span className="text-lg font-bold text-[var(--foreground)]">{agendaMin > 0 ? formatMinutes(agendaMin) : "0m"}</span>
          <span className="text-[10px] font-medium text-[var(--muted-foreground)] mt-0.5 uppercase tracking-wide">Agendas</span>
        </div>
        {scheduledMin > 0 && (
          <div className="flex flex-col items-center justify-center px-5 py-3 flex-1">
            <span className={`text-sm font-bold ${statusColor}`}>{statusText}</span>
            <span className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Duration budget</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface AgendaCardProps {
  agenda: AgendaSubmission;
  allAgendas: AgendaSubmission[];
  checked: boolean;
  onToggle: (id: string) => void;
  disabled: boolean;
}
function AgendaCard({ agenda, allAgendas, checked, onToggle, disabled }: AgendaCardProps) {
  const aid = agenda.agenda_id ?? agenda.id;
  const children = allAgendas.filter(a => a.parent_agenda_id === aid && !a.archived_at);
  const totalMin = children.reduce((s, c) => s + parseDurationMin(c.estimated_duration), 0)
    + parseDurationMin(agenda.estimated_duration);
  const { label: statusLabel, color, schedulingBlocked } = agendaReadinessLabel(agenda, allAgendas);

  return (
    <label className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
      ${checked ? "bg-[var(--primary)]/8" : "hover:bg-[var(--surface-raised)]"}
      ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => !disabled && onToggle(aid)}
        className="shrink-0 accent-[var(--primary)]"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-[var(--foreground)] truncate">{agenda.agenda_title}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium
            ${color === "emerald"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
            {statusLabel}
          </span>
          {schedulingBlocked && checked && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
              <AlertTriangle size={9} />Scheduling blocked
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[10px] text-[var(--muted-foreground)]">
          {children.length > 0 && <span>{children.length} child{children.length !== 1 ? "ren" : ""}</span>}
          {totalMin > 0 && <span><Clock size={9} className="inline mr-0.5" />{formatMinutes(totalMin)}</span>}
          {agenda.purpose && <span>{agenda.purpose}</span>}
          {agenda.confidentiality && <span>{agenda.confidentiality}</span>}
        </div>
      </div>
    </label>
  );
}

interface SelectedRowProps {
  entry: SelectedAgendaEntry;
  agenda: AgendaSubmission | undefined;
  allAgendas: AgendaSubmission[];
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRemove: (id: string) => void;
  onPreview: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
  canEdit: boolean;
}
function SelectedRow({ entry, agenda, allAgendas, onMoveUp, onMoveDown, onRemove, onPreview, isFirst, isLast, canEdit }: SelectedRowProps) {
  if (!agenda) return null;
  const aid = agenda.agenda_id ?? agenda.id;
  const children = allAgendas.filter(a => a.parent_agenda_id === aid && !a.archived_at);
  const totalMin = children.reduce((s, c) => s + parseDurationMin(c.estimated_duration), 0)
    + parseDurationMin(agenda.estimated_duration);

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border border-[var(--border)] rounded-xl bg-[var(--surface)] hover:shadow-sm transition-shadow">
      <span className="w-7 h-7 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold flex items-center justify-center shrink-0">
        {entry.display_order}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-[var(--foreground)] truncate">{agenda.agenda_title}</div>
        <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
          {[children.length > 0 && `${children.length} children`, totalMin > 0 && formatMinutes(totalMin)].filter(Boolean).join(" · ")}
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button type="button" onClick={() => onPreview(aid)} className="p-1 rounded hover:bg-[var(--surface-raised)] text-[var(--muted-foreground)]" title="Preview"><Eye size={12} strokeWidth={2} /></button>
        {canEdit && (
          <>
            <button type="button" disabled={isFirst} onClick={() => onMoveUp(aid)} className="p-1 rounded hover:bg-[var(--surface-raised)] text-[var(--muted-foreground)] disabled:opacity-30" title="Move up"><ChevronUp size={12} strokeWidth={2} /></button>
            <button type="button" disabled={isLast} onClick={() => onMoveDown(aid)} className="p-1 rounded hover:bg-[var(--surface-raised)] text-[var(--muted-foreground)] disabled:opacity-30" title="Move down"><ChevronDown size={12} strokeWidth={2} /></button>
            <button type="button" onClick={() => onRemove(aid)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-[var(--muted-foreground)] hover:text-red-500" title="Remove"><X size={12} strokeWidth={2} /></button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AgendaDocumentStep({
  values,
  onValuesChange,
  allAgendas,
  agendaDocLinks,
  allDocuments,
  existingMeetingAgendaLinks,
  canManage,
  onRequestDocumentComposer,
  onRequestAgendaComposer,
}: AgendaDocumentStepProps) {

  // ── Load initial state from form values ───────────────────────────────────
  const [selectedEntries, setSelectedEntries] = useState<SelectedAgendaEntry[]>(() => {
    try { return JSON.parse(String(values.selected_agenda_ids_json ?? "[]")) as SelectedAgendaEntry[]; }
    catch { return []; }
  });
  const [additionalDocs, setAdditionalDocs] = useState<AdditionalDocEntry[]>(() => {
    try { return JSON.parse(String(values.additional_doc_ids_json ?? "[]")) as AdditionalDocEntry[]; }
    catch { return []; }
  });

  const initialised = useRef(false);
  const sync = useCallback((entries: SelectedAgendaEntry[], extra: AdditionalDocEntry[]) => {
    onValuesChange({
      selected_agenda_ids_json: JSON.stringify(entries),
      additional_doc_ids_json: JSON.stringify(extra),
    });
  }, [onValuesChange]);

  useEffect(() => {
    if (!initialised.current) {
      initialised.current = true;
      sync(selectedEntries, additionalDocs);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateEntries = useCallback((next: SelectedAgendaEntry[]) => {
    setSelectedEntries(next);
    sync(next, additionalDocs);
  }, [additionalDocs, sync]);

  const updateDocs = useCallback((next: AdditionalDocEntry[]) => {
    setAdditionalDocs(next);
    sync(selectedEntries, next);
  }, [selectedEntries, sync]);

  // ── Agenda selector state ─────────────────────────────────────────────────
  const [agendaSearch, setAgendaSearch] = useState("");
  const [purposeFilter, setPurposeFilter] = useState("");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const [docSearch, setDocSearch] = useState("");

  const selectedIds = useMemo(
    () => new Set(selectedEntries.map(e => e.agenda_id)),
    [selectedEntries],
  );

  // ── Duration calculation ──────────────────────────────────────────────────
  const scheduledMin = useMemo(() => {
    const s = String(values.start_time ?? "");
    const e = String(values.end_time ?? "");
    if (!s || !e) return 0;
    return Math.max(0, parseTimeToMin(e) - parseTimeToMin(s));
  }, [values.start_time, values.end_time]);

  const agendaTotalMin = useMemo(() => {
    return selectedEntries.reduce((sum, entry) => {
      const parent = allAgendas.find(a => (a.agenda_id ?? a.id) === entry.agenda_id);
      if (!parent) return sum;
      const children = allAgendas.filter(a => a.parent_agenda_id === entry.agenda_id && !a.archived_at);
      const childMin = children.reduce((s, c) => s + parseDurationMin(c.estimated_duration), 0);
      return sum + parseDurationMin(parent.estimated_duration) + childMin;
    }, 0);
  }, [selectedEntries, allAgendas]);

  // ── Eligible agendas (for selector) — all non-archived L1 agendas ────────
  const eligibleAgendas = useMemo(() => {
    const q = agendaSearch.toLowerCase();
    return allAgendas
      .filter(a => isEligibleParent(a, selectedIds, existingMeetingAgendaLinks))
      .filter(a => !purposeFilter || a.purpose === purposeFilter)
      .filter(a => !q || (a.agenda_title ?? "").toLowerCase().includes(q) || (a.agenda_reference ?? "").toLowerCase().includes(q));
  }, [allAgendas, selectedIds, existingMeetingAgendaLinks, agendaSearch, purposeFilter]);

  // ── Agenda documents (auto-derived) ──────────────────────────────────────
  const relevantAgendaIds = useMemo(() => {
    const ids = new Set<string>(selectedEntries.map(e => e.agenda_id));
    // Add children of each selected parent
    selectedEntries.forEach(e => {
      allAgendas.filter(a => a.parent_agenda_id === e.agenda_id && !a.archived_at)
        .forEach(c => ids.add(c.agenda_id ?? c.id));
    });
    return ids;
  }, [selectedEntries, allAgendas]);

  const agendaDocs = useMemo(() => {
    // Documents linked via AgendaDocumentLink registry
    const linkedDocIds = new Set(
      agendaDocLinks.filter(l => relevantAgendaIds.has(l.agenda_id)).map(l => l.document_id),
    );
    // Also pick up documents with related_agenda set to a selected agenda
    const docsByRelated = allDocuments.filter(d => d.related_agenda && relevantAgendaIds.has(d.related_agenda));
    const byLink = allDocuments.filter(d => linkedDocIds.has(d.id) || linkedDocIds.has(d.doc_id));
    // Merge, dedup by id
    const seen = new Set<string>();
    return [...byLink, ...docsByRelated].filter(d => {
      const key = d.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [agendaDocLinks, allDocuments, relevantAgendaIds]);

  // ── Additional document picker ────────────────────────────────────────────
  const additionalDocIds = useMemo(
    () => new Set(additionalDocs.map(d => d.doc_id)),
    [additionalDocs],
  );
  const agendaDocIds = useMemo(
    () => new Set(agendaDocs.map(d => d.doc_id ?? d.id)),
    [agendaDocs],
  );

  const pickableDocuments = useMemo(() => {
    const q = docSearch.toLowerCase();
    return allDocuments
      .filter(d => !agendaDocIds.has(d.doc_id ?? d.id) && !additionalDocIds.has(d.doc_id ?? d.id))
      .filter(d => d.approval_status !== "Draft")
      .filter(d => !q || (d.doc_name ?? "").toLowerCase().includes(q) || (d.doc_type ?? "").toLowerCase().includes(q))
      .slice(0, 40);
  }, [allDocuments, agendaDocIds, additionalDocIds, docSearch]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function addPending() {
    if (!canManage || pendingIds.size === 0) return;
    const nextOrder = selectedEntries.length;
    const toAdd = eligibleAgendas.filter(a => pendingIds.has(a.agenda_id ?? a.id));
    const added = toAdd.map((a, i) => ({
      agenda_id: a.agenda_id ?? a.id,
      display_order: nextOrder + i + 1,
    }));
    updateEntries([...selectedEntries, ...added]);
    setPendingIds(new Set());
  }

  function reorder(newEntries: SelectedAgendaEntry[]) {
    updateEntries(newEntries.map((e, i) => ({ ...e, display_order: i + 1 })));
  }

  function moveUp(aid: string) {
    const idx = selectedEntries.findIndex(e => e.agenda_id === aid);
    if (idx <= 0) return;
    const next = [...selectedEntries];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    reorder(next);
  }

  function moveDown(aid: string) {
    const idx = selectedEntries.findIndex(e => e.agenda_id === aid);
    if (idx < 0 || idx >= selectedEntries.length - 1) return;
    const next = [...selectedEntries];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    reorder(next);
  }

  function removeEntry(aid: string) {
    if (!canManage) return;
    updateEntries(selectedEntries.filter(e => e.agenda_id !== aid).map((e, i) => ({ ...e, display_order: i + 1 })));
  }

  function addAdditionalDoc(doc: BoardDocument) {
    if (!canManage) return;
    const did = doc.doc_id ?? doc.id;
    if (additionalDocIds.has(did)) return;
    updateDocs([...additionalDocs, { doc_id: did, version: doc.version ?? "1.0", source_label: doc.doc_name }]);
  }

  function removeAdditionalDoc(did: string) {
    if (!canManage) return;
    updateDocs(additionalDocs.filter(d => d.doc_id !== did));
  }

  // ── Preview panel ─────────────────────────────────────────────────────────
  const previewAgenda = previewId ? allAgendas.find(a => (a.agenda_id ?? a.id) === previewId) : null;
  const previewChildren = previewAgenda
    ? allAgendas.filter(a => a.parent_agenda_id === (previewAgenda.agenda_id ?? previewAgenda.id) && !a.archived_at)
    : [];

  // ── Purpose options ───────────────────────────────────────────────────────
  const purposeOptions = useMemo(() => {
    const s = new Set<string>();
    allAgendas.forEach(a => { if (a.purpose) s.add(a.purpose); });
    return Array.from(s).sort();
  }, [allAgendas]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Duration banner */}
      <DurationBanner scheduledMin={scheduledMin} agendaMin={agendaTotalMin} />

      {/* Preview overlay */}
      {previewAgenda && (
        <div className="border border-[var(--border)] rounded-lg p-3 bg-[var(--surface)] mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--foreground)]">
              Preview: {previewAgenda.agenda_title}
            </span>
            <button type="button" onClick={() => setPreviewId(null)} className="p-0.5 rounded hover:bg-[var(--surface-raised)] text-[var(--muted-foreground)]"><X size={13} strokeWidth={2} /></button>
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)] space-y-0.5 mb-2">
            <div>Reference: {previewAgenda.agenda_reference}</div>
            {previewAgenda.purpose && <div>Purpose: {previewAgenda.purpose}</div>}
            {previewAgenda.estimated_duration && <div>Duration: {previewAgenda.estimated_duration}</div>}
            {previewAgenda.confidentiality && <div>Confidentiality: {previewAgenda.confidentiality}</div>}
          </div>
          {previewChildren.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-[var(--muted-foreground)] mb-1">Child Agendas ({previewChildren.length})</div>
              <div className="space-y-0.5 pl-2 border-l-2 border-[var(--border)]">
                {previewChildren.map(c => (
                  <div key={c.id} className="flex items-center gap-1.5 text-[10px] text-[var(--foreground)]">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.approval_status === "Approved" ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <span>{c.agenda_title}</span>
                    <span className="text-[var(--muted-foreground)]">{c.estimated_duration}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── AGENDA SELECTOR ──────────────────────────────────────────────── */}
      <div className="border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
        {/* Panel header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
          <span className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
            <BookOpen size={15} strokeWidth={2} />
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-[var(--foreground)]">Select Agendas</span>
            <span className="ml-2 text-xs text-[var(--muted-foreground)]">
              {eligibleAgendas.length > 0 ? `${eligibleAgendas.length} available` : "No eligible agendas"}
            </span>
          </div>
          {onRequestAgendaComposer && canManage && (
            <button
              type="button"
              onClick={() => onRequestAgendaComposer((result) => {
                const newEntry: SelectedAgendaEntry = {
                  agenda_id: result.agendaId,
                  display_order: selectedEntries.length + 1,
                };
                updateEntries([...selectedEntries, newEntry]);
              })}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] px-3 py-1.5 rounded-lg border border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 transition-colors shrink-0"
            >
              <Plus size={12} strokeWidth={2.5} />
              New Agenda
            </button>
          )}
        </div>
        <div className="p-4 space-y-3">
          {/* Search + filter row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={13} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Search agendas…"
                value={agendaSearch}
                onChange={e => setAgendaSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
              />
            </div>
            {purposeOptions.length > 0 && (
              <select
                value={purposeFilter}
                onChange={e => setPurposeFilter(e.target.value)}
                className="text-xs border border-[var(--border)] rounded-lg px-2 py-2 bg-[var(--background)] text-[var(--foreground)]"
              >
                <option value="">All purposes</option>
                {purposeOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
          </div>

          {/* Agenda list */}
          <div className="max-h-52 overflow-y-auto space-y-1 rounded-lg">
            {eligibleAgendas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <BookOpen size={32} strokeWidth={1.5} className="text-[var(--primary)]/50" />
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {agendaSearch || purposeFilter ? "No agendas match" : "No eligible agendas"}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {agendaSearch || purposeFilter
                    ? "Try a different search or filter"
                    : "No agendas found. Create one from Agenda Management first."}
                </p>
              </div>
            ) : (
              eligibleAgendas.map(a => (
                <AgendaCard
                  key={a.id}
                  agenda={a}
                  allAgendas={allAgendas}
                  checked={pendingIds.has(a.agenda_id ?? a.id)}
                  onToggle={id => {
                    if (!canManage) return;
                    setPendingIds(prev => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id); else next.add(id);
                      return next;
                    });
                  }}
                  disabled={!canManage}
                />
              ))
            )}
          </div>

          {pendingIds.size > 0 && canManage && (
            <button
              type="button"
              onClick={addPending}
              className="w-full py-2.5 text-sm font-semibold rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
            >
              Add {pendingIds.size} agenda{pendingIds.size !== 1 ? "s" : ""} →
            </button>
          )}
        </div>
      </div>

      {/* ── SELECTED AGENDAS ─────────────────────────────────────────────── */}
      {selectedEntries.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-[var(--foreground)]">Meeting Agenda</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--primary)] text-white font-semibold">
              {selectedEntries.length}
            </span>
            <span className="text-xs text-[var(--muted-foreground)] ml-auto">{formatMinutes(agendaTotalMin)} total</span>
          </div>
          <div className="space-y-1.5">
            {selectedEntries.map((entry, idx) => {
              const agenda = allAgendas.find(a => (a.agenda_id ?? a.id) === entry.agenda_id);
              return (
                <SelectedRow
                  key={entry.agenda_id}
                  entry={entry}
                  agenda={agenda}
                  allAgendas={allAgendas}
                  onMoveUp={moveUp}
                  onMoveDown={moveDown}
                  onRemove={removeEntry}
                  onPreview={setPreviewId}
                  isFirst={idx === 0}
                  isLast={idx === selectedEntries.length - 1}
                  canEdit={canManage}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── AGENDA DOCUMENTS (auto) ────────────────────────────────────── */}
      {agendaDocs.length > 0 && (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <FileText size={15} strokeWidth={2} />
            </span>
            <div className="flex-1">
              <span className="text-sm font-bold text-[var(--foreground)]">Agenda Documents</span>
              <span className="ml-2 text-xs text-[var(--muted-foreground)]">{agendaDocs.length} auto-linked</span>
            </div>
            <span className="text-xs text-[var(--muted-foreground)] italic">From selected agendas</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {agendaDocs.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center shrink-0">
                  <FileText size={13} strokeWidth={2} />
                </span>
                <span className="text-sm text-[var(--foreground)] flex-1 truncate font-medium">{doc.doc_name}</span>
                <div className="flex gap-1.5 shrink-0">
                  {doc.version && <span className="text-xs text-[var(--muted-foreground)] px-2 py-0.5 rounded-full bg-[var(--background)] border border-[var(--border)]">v{doc.version}</span>}
                  {doc.confidentiality && <span className="text-xs text-[var(--muted-foreground)] px-2 py-0.5 rounded-full bg-[var(--background)] border border-[var(--border)]">{doc.confidentiality}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ADDITIONAL DOCUMENTS ─────────────────────────────────────────── */}
      <div className="border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
          <span className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
            <Files size={15} strokeWidth={2} />
          </span>
          <span className="text-sm font-bold text-[var(--foreground)] flex-1">Additional Documents</span>
          {canManage && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDocPickerOpen(v => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-raised)] text-[var(--foreground)] transition-colors"
              >
                <BookOpen size={12} strokeWidth={2} />
                {docPickerOpen ? "Close" : "From Library"}
              </button>
              <button
                type="button"
                onClick={() => onRequestDocumentComposer(docId => {
                  const doc = allDocuments.find(d => d.id === docId || d.doc_id === docId);
                  if (doc) addAdditionalDoc(doc);
                })}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-raised)] text-[var(--foreground)] transition-colors"
              >
                <Plus size={12} strokeWidth={2.5} />Upload New
              </button>
            </div>
          )}
        </div>

        {/* Document Library picker */}
        {docPickerOpen && (
          <div className="p-2 border-b border-[var(--border)] space-y-1.5">
            <div className="relative">
              <Search size={11} strokeWidth={2} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Search Document Library…"
                value={docSearch}
                onChange={e => setDocSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-2 text-xs border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
              />
            </div>
            <div className="max-h-36 overflow-y-auto space-y-0.5">
              {pickableDocuments.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)] text-center py-4 italic">
                  {docSearch ? "No documents match" : "All documents already selected or linked"}
                </p>
              ) : (
                pickableDocuments.map(doc => (
                  <label key={doc.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--surface-raised)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={additionalDocIds.has(doc.doc_id ?? doc.id)}
                      onChange={e => {
                        if (e.target.checked) addAdditionalDoc(doc);
                        else removeAdditionalDoc(doc.doc_id ?? doc.id);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-[var(--foreground)] truncate">{doc.doc_name}</div>
                      <div className="text-[10px] text-[var(--muted-foreground)]">
                        {[doc.doc_type, doc.version && `v${doc.version}`, doc.confidentiality].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        {/* Selected additional docs */}
        {additionalDocs.length > 0 ? (
          <div className="divide-y divide-[var(--border)]">
            {additionalDocs.map(ad => {
              const doc = allDocuments.find(d => d.doc_id === ad.doc_id || d.id === ad.doc_id);
              return (
                <div key={ad.doc_id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-7 h-7 rounded-lg bg-[var(--primary)]/8 text-[var(--primary)] flex items-center justify-center shrink-0">
                    <FileText size={13} strokeWidth={2} />
                  </span>
                  <span className="text-sm text-[var(--foreground)] flex-1 truncate font-medium">
                    {doc?.doc_name ?? ad.source_label}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {ad.version && <span className="text-xs text-[var(--muted-foreground)] px-2 py-0.5 rounded-full bg-[var(--background)] border border-[var(--border)]">v{ad.version}</span>}
                    {canManage && (
                      <button type="button" onClick={() => removeAdditionalDoc(ad.doc_id)} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-[var(--muted-foreground)] transition-colors"><X size={13} strokeWidth={2} /></button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !docPickerOpen && (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <Files size={32} strokeWidth={1.5} className="text-[var(--primary)]/50" />
              <p className="text-sm font-medium text-[var(--foreground)]">No additional documents</p>
              <p className="text-xs text-[var(--muted-foreground)]">Use &quot;From Library&quot; to attach existing documents or &quot;Upload New&quot; to add new ones.</p>
            </div>
          )
        )}
      </div>

      {/* Summary */}
      {(selectedEntries.length > 0 || additionalDocs.length > 0 || agendaDocs.length > 0) && (
        <div className="flex flex-wrap gap-2 px-1">
          {selectedEntries.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400">
              <CheckCircle2 size={12} />{selectedEntries.length} agenda{selectedEntries.length !== 1 ? "s" : ""} selected
            </span>
          )}
          {agendaDocs.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400">
              <CheckCircle2 size={12} />{agendaDocs.length} document{agendaDocs.length !== 1 ? "s" : ""} linked
            </span>
          )}
          {additionalDocs.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400">
              <CheckCircle2 size={12} />{additionalDocs.length} additional
            </span>
          )}
          {selectedEntries.length === 0 && (
            <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400">
              <AlertTriangle size={12} />No agendas selected
            </span>
          )}
        </div>
      )}
    </div>
  );
}
