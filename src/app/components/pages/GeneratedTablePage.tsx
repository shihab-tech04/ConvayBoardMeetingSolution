import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { Plus, ChevronUp, ChevronDown, Pencil } from "lucide-react";
import { toast } from "sonner";
import { handleExportDisabled } from "../../utils/exportDisabled";
import { CollapsibleKpiSection } from "../cards/CollapsibleKpiSection";
import { DynamicDetailsDrawer } from "../drawers/DynamicDetailsDrawer";
import { AppModal } from "../modals/AppModal";
import { SConfirmModal } from "../modals/SConfirmModal";
import { SecondaryButton } from "../buttons/SecondaryButton";
import { PrimaryButton } from "../buttons/PrimaryButton";
import { Button } from "../buttons/Button";
import { AppTextArea } from "../forms/AppTextArea";
import { EntryForm, type FormField, type EntryFormValue } from "../forms/EntryForm";
import { UnifiedDataTable } from "../tables";
import type { TabDef } from "../tables";
import type { PageCfg, TableRow } from "../../pages/modulePageUtils";
import { type AttachmentItem, getAttachmentPreviewKind, formatFileSize } from "../attachments/attachmentTypes";
import { ZONES, CIRCLES, AY_OPTS } from "../../pages/modulePageUtils";

const PER = 10;

interface GeneratedTablePageProps {
  cfg: PageCfg;
  drawerFields?: { label: string; key: string }[];
  wrapTitle?: boolean;
}

// ── Row creation helpers ──────────────────────────────────────────────────────

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function getNextNumericId(rows: TableRow[]): string {
  const nums = rows
    .map(r => Number(r.id))
    .filter(n => !isNaN(n) && n > 0);
  return String(nums.length > 0 ? Math.max(...nums) + 1 : 1001);
}

function getNextCode(rows: TableRow[], key: string, prefix: string): string {
  const existing = rows
    .map(r => String(r[key] ?? ""))
    .filter(v => v.startsWith(prefix))
    .map(v => parseInt(v.replace(prefix, ""), 10))
    .filter(n => !isNaN(n));
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 9000;
  return `${prefix}${next}`;
}

function getFileSummary(files: File[]): string {
  return files.length === 0 ? "0 files" : `${files.length} file${files.length > 1 ? "s" : ""}`;
}

function getFileNames(files: File[]): string {
  return files.map(f => f.name).join(", ");
}

function createAttachmentItems(files: File[]): AttachmentItem[] {
  return files.map((file, i) => {
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
    return {
      id: `att-${Date.now()}-${i}`,
      name: file.name,
      size: file.size,
      sizeLabel: formatFileSize(file.size),
      type: file.type || "application/octet-stream",
      extension: ext,
      previewKind: getAttachmentPreviewKind(file.name, file.type),
      objectUrl: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
    };
  });
}

function revokeRowAttachmentUrls(rows: TableRow[]): void {
  for (const row of rows) {
    for (const val of Object.values(row)) {
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item === "object" && "objectUrl" in item && item.objectUrl) {
            URL.revokeObjectURL(item.objectUrl as string);
          }
        }
      }
    }
  }
}

function createPsrEntryRow(
  values: Record<string, EntryFormValue>,
  fields: FormField[],
  existingRows: TableRow[]
): TableRow {
  const get = (key: string): string => {
    const f = fields.find(f => f.key === key);
    if (!f) return "";
    const idx = fields.indexOf(f);
    const id = f.key ?? `entry-field-${idx}`;
    const v = values[id];
    return typeof v === "string" ? v : "";
  };
  const getFiles = (key: string): File[] => {
    const f = fields.find(f => f.key === key);
    if (!f) return [];
    const idx = fields.indexOf(f);
    const id = f.key ?? `entry-field-${idx}`;
    const v = values[id];
    return Array.isArray(v) ? (v as File[]) : [];
  };

  const files = getFiles("attachments");
  const minutesRef = get("minutes_ref").trim() || getNextCode(existingRows, "minutes_ref", "MIN-");

  return {
    id: getNextNumericId(existingRows),
    meeting_id: get("meeting_id"),
    meeting_title: get("meeting_title"),
    committee: get("committee"),
    meeting_year: get("meeting_year"),
    meeting_type: get("meeting_type"),
    minutes_ref: minutesRef,
    submitted_by: get("submitted_by"),
    submission_date: get("submission_date") || getTodayISO(),
    approval_status: "Pending Approval",
    attachment_count: getFileSummary(files),
    attachment_names: getFileNames(files),
    attachments: createAttachmentItems(files),
    remarks: get("remarks"),
  };
}

function createPsrBulkRows(
  values: Record<string, EntryFormValue>,
  fields: FormField[],
  existingRows: TableRow[]
): TableRow[] {
  const get = (key: string): string => {
    const f = fields.find(f => f.key === key);
    if (!f) return "";
    const idx = fields.indexOf(f);
    const id = f.key ?? `entry-field-${idx}`;
    const v = values[id];
    return typeof v === "string" ? v : "";
  };
  const getFiles = (key: string): File[] => {
    const f = fields.find(f => f.key === key);
    if (!f) return [];
    const idx = fields.indexOf(f);
    const id = f.key ?? `entry-field-${idx}`;
    const v = values[id];
    return Array.isArray(v) ? (v as File[]) : [];
  };

  const files = getFiles("attachments");
  const meetingYear = get("meeting_year");
  const committee = get("committee");
  const meetingType = get("meeting_type");
  const remarks = get("remarks");
  const today = getTodayISO();
  let baseId = Number(getNextNumericId(existingRows));

  return files.map((file, i) => {
    const minutesRef = getNextCode([...existingRows, ...Array(i).fill({ minutes_ref: `MIN-${9000 + baseId + i - 1}` })], "minutes_ref", "MIN-");
    return {
      id: String(baseId + i),
      meeting_id: `MTG-BULK-${baseId + i}`,
      meeting_title: "Bulk Uploaded Record",
      committee,
      meeting_year: meetingYear,
      meeting_type: meetingType,
      minutes_ref: minutesRef,
      submitted_by: "Bulk Upload",
      submission_date: today,
      approval_status: "Pending Approval",
      source_file: file.name,
      attachment_count: "1 file",
      attachment_names: file.name,
      attachments: createAttachmentItems([file]),
      remarks,
    };
  });
}

function createGenericRow(
  values: Record<string, EntryFormValue>,
  fields: FormField[],
  existingRows: TableRow[]
): TableRow {
  const row: TableRow = { id: getNextNumericId(existingRows) };
  fields.forEach((f, i) => {
    const key = f.key ?? f.label.toLowerCase().replace(/\s+/g, "_");
    const id = f.key ?? `entry-field-${i}`;
    const v = values[id];
    if (f.type === "file") {
      const files = (Array.isArray(v) ? v : []) as File[];
      row[`${key}_count`] = getFileSummary(files);
      row[`${key}_names`] = getFileNames(files);
      row[key] = createAttachmentItems(files);
    } else {
      row[key] = typeof v === "string" ? v : "";
    }
  });
  return row;
}

function buildInitialValuesFromRow(row: TableRow, fields: FormField[]): Record<string, EntryFormValue> {
  const out: Record<string, EntryFormValue> = {};
  fields.forEach((f, i) => {
    if (!f.key) return;
    const id = f.key ?? `entry-field-${i}`;
    const v = row[f.key];
    if (v === undefined || v === null) return;
    if (f.type === "toggle" || f.type === "checkbox") {
      out[id] = v === true || v === "true" || v === "Yes";
    } else if (f.type === "multiselect") {
      out[id] = Array.isArray(v) ? (v as unknown as string[]) : String(v).split(",").map(s => s.trim()).filter(Boolean);
    } else if (f.type === "file") {
      out[id] = [];
    } else if (f.type === "select" && Array.isArray(f.options) && f.options.length > 0 && typeof f.options[0] === "object") {
      // Structured options: { value, label }. Resolve stored name→id if needed.
      const strV = String(v);
      const opts = f.options as { value: string; label: string }[];
      if (opts.some(o => o.value === strV)) {
        out[id] = strV;
      } else {
        // Try matching by label prefix (stored display name → option value)
        const match = opts.find(o => o.label === strV || o.label.startsWith(strV + " —") || o.label.startsWith(strV + " ("));
        out[id] = match ? match.value : "";
      }
    } else {
      out[id] = String(v);
    }
  });
  return out;
}

// ── Form field builders ───────────────────────────────────────────────────────────

function buildDefaultEntryFields(): FormField[] {
  return [
    { key: "meeting_title",   label: "Title",            type: "text",     required: true },
    { key: "committee",       label: "Committee",         type: "select",   required: true, options: CIRCLES },
    { key: "meeting_type",    label: "Meeting Type",      type: "select",   required: true, options: ZONES },
    { key: "meeting_year",    label: "Year",              type: "select",   required: true, options: AY_OPTS },
    { key: "date",            label: "Date",              type: "date",     required: true, defaultValue: getTodayISO() },
    { key: "submitted_by",    label: "Submitted By",      type: "text" },
    { key: "attachments",     label: "Attachments",       type: "file",     maxFiles: 5, maxSizeMB: 2, accept: [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".xls", ".xlsx"], span: true },
    { key: "remarks",         label: "Remarks",           type: "textarea", span: true },
  ];
}

function buildPsrEntryFields(): FormField[] {
  return [
    { key: "meeting_id",      label: "Meeting ID",        type: "text",     required: true },
    { key: "meeting_title",   label: "Meeting Title",     type: "text",     required: true },
    { key: "meeting_year",    label: "Meeting Year",      type: "select",   required: true, options: AY_OPTS },
    { key: "committee",       label: "Committee",         type: "select",   required: true, options: CIRCLES },
    { key: "meeting_type",    label: "Meeting Type",      type: "select",   required: true, options: ZONES },
    { key: "minutes_ref",     label: "Minutes Ref.",      type: "text",     helper: "Leave blank to auto-generate" },
    { key: "submitted_by",    label: "Submitted By",      type: "text",     required: true },
    { key: "submission_date", label: "Submission Date",   type: "date",     required: true, defaultValue: getTodayISO() },
    { key: "attachments",     label: "Attachments",       type: "file",     maxFiles: 5, maxSizeMB: 2, accept: [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".xls", ".xlsx"], span: true },
    { key: "remarks",         label: "Remarks",           type: "textarea", span: true },
  ];
}

function buildPsrBulkEntryFields(): FormField[] {
  return [
    { key: "meeting_year",    label: "Meeting Year",      type: "select",   required: true, options: AY_OPTS },
    { key: "committee",       label: "Committee",         type: "select",   required: true, options: CIRCLES },
    { key: "meeting_type",    label: "Meeting Type",      type: "select",   required: true, options: ZONES },
    { key: "attachments",     label: "Attachments",       type: "file",     required: true, maxFiles: 5, maxSizeMB: 2, accept: [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".xls", ".xlsx"], span: true, helper: "Upload multiple documents" },
    { key: "remarks",         label: "Remarks",           type: "textarea", span: true },
  ];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GeneratedTablePage({ cfg, drawerFields, wrapTitle }: GeneratedTablePageProps) {
  const navigate = useNavigate();
  const resolvedTitle = cfg.title;
  const resolvedDesc  = cfg.desc;
  const storageKey    = `kpi-collapsed:${cfg.titleKey ?? cfg.title}`;
  // Singular entity name derived from title for use in modals/toasts
  const entityName = cfg.title
    .replace(/^(All|My|Active|Archived|Draft|Pending)\s+/i, "")
    .replace(/ies$/, "y")
    .replace(/s$/, "");
  const searchPlaceholder = cfg.searchPlaceholder ?? `Search ${entityName.toLowerCase()}s`;

  const [kpiOpen, setKpiOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(storageKey) !== "false"; } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem(storageKey, String(kpiOpen)); } catch { /* ignore */ }
  }, [kpiOpen, storageKey]);

  // ── Local row state ──────────────────────────────────────────────────────
  const [rows, setRows] = useState<TableRow[]>(() => cfg.rows);
  useEffect(() => { setRows(cfg.rows); }, [cfg.rows]);

  // Revoke object URLs on unmount to avoid memory leaks
  const rowsRef = useRef(rows);
  useEffect(() => { rowsRef.current = rows; }, [rows]);
  useEffect(() => () => { revokeRowAttachmentUrls(rowsRef.current); }, []);

  const [page, setPage]     = useState(1);
  const [q, setQ]           = useState("");
  const [fVals, setFVals]   = useState<Record<string, string>>({});
  const [applied, setApplied] = useState<Record<string, string>>({});
  const [drawer, setDrawer] = useState<TableRow | null>(null);
  const [modal, setModal]   = useState<string | null>(cfg.initialModal ?? null);
  const [entryStep, setEntryStep] = useState(0);
  const [stepValues, setStepValues] = useState<Record<string, EntryFormValue>>({});
  const [editRow, setEditRow] = useState<TableRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<TableRow | null>(null);
  const [approveRow, setApproveRow] = useState<TableRow | null>(null);
  const [rejectRow, setRejectRow] = useState<TableRow | null>(null);
  const [approveRemark, setApproveRemark] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [revisionRow, setRevisionRow] = useState<TableRow | null>(null);
  const [revisionInstructions, setRevisionInstructions] = useState("");
  const [revisionError, setRevisionError] = useState("");
  const [cancelRow, setCancelRow] = useState<TableRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [postponeRow, setPostponeRow] = useState<TableRow | null>(null);
  const [postponeReason, setPostponeReason] = useState("");
  const [postponeError, setPostponeError] = useState("");
  const [createNextRow, setCreateNextRow] = useState<TableRow | null>(null);
  const [reviewRow, setReviewRow] = useState<TableRow | null>(null);
  const [reviewStep, setReviewStep] = useState(0);
  const [activeStatusTab, setActiveStatusTab] = useState("all");
  const [wizardDraftId, setWizardDraftId] = useState<string | null>(null);
  // Ref tracks latest allValues from the active EntryForm so Save Draft can read current state
  const latestEntryValues = useRef<Record<string, EntryFormValue>>({});

  const sourceForDrawer = cfg.drawerCols ?? cfg.cols;
  const drawerColumns = useMemo(() => sourceForDrawer.flatMap(col => {
    if (col.type === "col") {
      return [{ key: col.col.key, label: col.col.label, labelKey: col.col.headerKey }];
    }
    return col.group.cols.map(subCol => ({
      key: subCol.key, label: subCol.label,
      labelKey: subCol.headerKey,
      groupLabel: col.group.label, groupLabelKey: col.group.groupKey,
    }));
  }), [sourceForDrawer]);

  // Auto-detect the badge field key from cols, unless cfg.statusTabField is set
  const statusTabField = useMemo(() => {
    if (cfg.statusTabField) return cfg.statusTabField;
    for (const c of cfg.cols) {
      if (c.type === "col" && c.col.badge) return c.col.key;
    }
    return null;
  }, [cfg.cols, cfg.statusTabField]);

  // Returns true when a row's status field matches a tab definition.
  // Respects the tab's optional `values` array and `match` function.
  const rowMatchesTab = useCallback((row: TableRow, tabId: string): boolean => {
    if (!statusTabField) return true;
    const tabDef = cfg.statusTabs?.find(t => t.id === tabId);
    if (tabDef?.match) return tabDef.match(row);
    const rowVal = String(row[statusTabField] ?? "").toLowerCase();
    if (tabDef?.values && tabDef.values.length > 0) {
      return tabDef.values.some(v => v.toLowerCase() === rowVal);
    }
    return rowVal === tabId.toLowerCase();
  }, [statusTabField, cfg.statusTabs]);

  // Step 1-3: Search + standard filters applied to live rows (no tab filter yet).
  // Tab counts are derived from this result so they reflect current search/filter state.
  const searchFiltered = useMemo(() =>
    rows.filter(r => {
      if (q && !Object.values(r).some(v => String(v).toLowerCase().includes(q.toLowerCase()))) return false;
      for (const [key, val] of Object.entries(applied)) {
        if (!val || val === "All") continue;
        if (key === "from") {
          const dateVal = String(r.meeting_date ?? r.submission_date ?? r.due_date ?? r.date ?? r.effective_date ?? r.publication_date ?? r.created_at ?? "").slice(0, 10);
          if (dateVal && dateVal < val) return false;
        } else if (key === "to") {
          const dateVal = String(r.meeting_date ?? r.submission_date ?? r.due_date ?? r.date ?? r.effective_date ?? r.publication_date ?? r.created_at ?? "").slice(0, 10);
          if (dateVal && dateVal > val) return false;
        } else {
          if (String(r[key] ?? "").toLowerCase() !== val.toLowerCase()) return false;
        }
      }
      return true;
    }),
    [rows, q, applied]
  );

  // Step 4: Tab counts derived from the search+filter result (live, not static config rows).
  const tabDefs = useMemo((): TabDef[] => {
    if (!statusTabField) return [];
    const all: TabDef = { id: "all", label: "All", count: searchFiltered.length };

    if (cfg.statusTabs) {
      return [all, ...cfg.statusTabs.map(t => ({
        id: t.id,
        label: t.label,
        count: searchFiltered.filter(r => rowMatchesTab(r, t.id)).length,
      }))];
    }

    // Auto-generate from unique status values present in the live search+filter result
    const seen = new Map<string, number>();
    for (const r of searchFiltered) {
      const val = String(r[statusTabField] ?? "");
      if (val) seen.set(val, (seen.get(val) ?? 0) + 1);
    }
    const generated = Array.from(seen.entries()).map(([val, count]) => ({ id: val, label: val, count }));
    return [all, ...generated];
  }, [searchFiltered, cfg.statusTabs, statusTabField, rowMatchesTab]);

  // Step 5: Apply active tab filter on top of search+filter result.
  const filtered = useMemo(() => {
    if (!activeStatusTab || activeStatusTab === "all" || !statusTabField) return searchFiltered;
    return searchFiltered.filter(r => rowMatchesTab(r, activeStatusTab));
  }, [searchFiltered, activeStatusTab, statusTabField, rowMatchesTab]);

  // Step 7: Pagination
  const pageRows = useMemo(() => filtered.slice((page - 1) * PER, page * PER), [filtered, page]);

  // Reset to "all" if the active tab is no longer present in the current tab list.
  // This handles auto-generated tabs that disappear when their status values vanish.
  useEffect(() => {
    if (activeStatusTab === "all") return;
    if (tabDefs.length === 0) return;
    const stillValid = tabDefs.some(t => t.id === activeStatusTab);
    if (!stillValid) {
      setActiveStatusTab("all");
      setPage(1);
    }
  }, [tabDefs, activeStatusTab]);

  // Clamp page to the last valid page when the filtered result shrinks.
  useEffect(() => {
    if (page <= 1) return;
    const maxPage = Math.max(1, Math.ceil(filtered.length / PER));
    if (page > maxPage) setPage(maxPage);
  }, [filtered.length, page]);

  const handleSearchChange = useCallback((value: string) => { setQ(value); setPage(1); }, []);
  const handleFilterChange = useCallback((k: string, v: string) => setFVals(p => ({ ...p, [k]: v })), []);
  const handleFilterApply  = useCallback(() => { setApplied(fVals); setPage(1); }, [fVals]);
  const handleFilterReset  = useCallback(() => { setFVals({}); setApplied({}); }, []);
  const handleRowClick     = useCallback((row: TableRow) => setDrawer(row), []);
  const handleDrawerClose  = useCallback(() => setDrawer(null), []);

  const defaultEntryFields = useMemo(() => buildDefaultEntryFields(), []);
  const entryFields = cfg.formFields ?? defaultEntryFields;

  const handleActionClick = useCallback((actionId: string, row: TableRow) => {
    switch (actionId) {
      case "view":
        setDrawer(row);
        break;
      case "edit":
        setDrawer(null);
        setEditRow(row);
        setEntryStep(0);
        setStepValues({});
        break;
      case "continue_setup":
        setDrawer(null);
        setEditRow(row);
        setEntryStep(Number(row.draft_current_step) || 0);
        setStepValues({});
        break;
      case "delete":
        setDeleteRow(row);
        break;
      case "approve":
        setDrawer(null);
        setApproveRow(row);
        setApproveRemark("");
        break;
      case "reject":
        setDrawer(null);
        setRejectRow(row);
        setRejectReason("");
        setRejectError("");
        break;
      case "duplicate": {
        const dup = buildInitialValuesFromRow(row, entryFields);
        setEditRow(null);
        setStepValues(dup);
        setEntryStep(0);
        setModal("entry");
        break;
      }
      case "create_next_meeting":
        setCreateNextRow(row);
        break;
      case "post_meeting_review":
        setReviewRow(row);
        break;
      case "publish":
        setRows(prev => prev.map(r => r === row ? { ...r, approval_status: "Published", status: "Published" } : r));
        toast.success(`${entityName} published.`);
        break;
      case "archive":
        setRows(prev => prev.map(r => r === row ? { ...r, approval_status: "Archived", status: "Archived" } : r));
        toast.success(`${entityName} archived.`);
        break;
      case "request_revision":
        setRevisionRow(row);
        setRevisionInstructions("");
        setRevisionError("");
        break;
      case "cancel":
        setCancelRow(row);
        setCancelReason("");
        setCancelError("");
        break;
      case "postpone":
        setPostponeRow(row);
        setPostponeReason("");
        setPostponeError("");
        break;
      default:
        if (cfg.onCustomAction) {
          cfg.onCustomAction(actionId, row);
        } else {
          setDrawer(row);
        }
    }
  }, [entryFields, cfg]);

  const handleDrawerEdit = useCallback(() => {
    if (!drawer) return;
    setDrawer(null);
    setEditRow(drawer);
    setEntryStep(0);
    setStepValues({});
  }, [drawer]);

  // ── Submit handlers ───────────────────────────────────────────────────────
  const handleEntrySubmit = useCallback((values: Record<string, EntryFormValue>) => {
    const newRow = createGenericRow(values, entryFields, rows);
    setRows(prev => [newRow, ...prev]);
    setPage(1);
    setModal(null);
    cfg.onRowCreate?.(values as Record<string, unknown>);
    toast.success(`${entityName} created.`);
  }, [rows, entryFields, cfg]);

  const handleExtraBtnSubmit = useCallback((btn: NonNullable<PageCfg["extraBtns"]>[number], fields: FormField[]) =>
    (values: Record<string, EntryFormValue>) => {
      if (btn.formKind === "psr-bulk-entry") {
        const newRows = createPsrBulkRows(values, fields, rows);
        if (newRows.length === 0) return;
        setRows(prev => [...newRows, ...prev]);
        setPage(1);
        setModal(null);
        toast.success(`${newRows.length} ${entityName.toLowerCase()} entries created.`);
      } else if (btn.formKind === "psr-entry") {
        const newRow = createPsrEntryRow(values, fields, rows);
        setRows(prev => [newRow, ...prev]);
        setPage(1);
        setModal(null);
        toast.success(`${entityName} created.`);
      } else {
        const newRow = createGenericRow(values, fields, rows);
        setRows(prev => [newRow, ...prev]);
        setPage(1);
        setModal(null);
        toast.success(`${entityName} created.`);
      }
    }, [rows]);

  return (
    <div className="table-page">
      {/* Page Header */}
      {!wrapTitle && (
        <div className="table-page__header">
          <div>
            <h1 className="table-page__title">{resolvedTitle}</h1>
            <p className="table-page__desc">{resolvedDesc}</p>
          </div>
          <div className="table-page__actions">
            {cfg.entryBtn && (
              <Button type="button" variant="primary" size="lg" leadingIcon={Plus} onClick={() => cfg.onEntryBtnClick ? cfg.onEntryBtnClick() : setModal("entry")}>{cfg.entryBtn}</Button>
            )}
            {cfg.extraBtns?.map((b) => {
              const Icon = b.icon;
              return (
                <Button key={b.id} type="button" variant="primary" size="lg" leadingIcon={Icon} onClick={() => setModal(`extra:${b.id}`)}>{b.label}</Button>
              );
            })}
            {cfg.kpis && (
              <button
                onClick={() => setKpiOpen(o => !o)}
                className="table-page__kpi-toggle"
                aria-expanded={kpiOpen}
                aria-controls="kpi-section-panel"
                aria-label={kpiOpen ? "Hide Summary" : "Show Summary"}
              >
                {kpiOpen
                  ? <><ChevronUp size={13} strokeWidth={2} aria-hidden="true" />{"Hide Summary"}</>
                  : <><ChevronDown size={13} strokeWidth={2} aria-hidden="true" />{"Show Summary"}</>
                }
              </button>
            )}
          </div>
        </div>
      )}

      {cfg.kpis && <CollapsibleKpiSection kpis={cfg.kpis} open={kpiOpen} />}

      <UnifiedDataTable
        title={resolvedTitle}
        countLabel={`${entityName.toLowerCase()}s`}
        singularLabel={entityName.toLowerCase()}
        totalCount={filtered.length}
        cols={cfg.cols}
        rows={pageRows}
        actions={cfg.actions}
        onViewRow={handleRowClick}
        aria-label={resolvedTitle}
        search={q}
        searchPlaceholder={searchPlaceholder}
        onSearchChange={handleSearchChange}
        filterDefs={cfg.filters.length > 0 ? cfg.filters : undefined}
        filterValues={fVals}
        appliedFilters={applied}
        onFilterChange={handleFilterChange}
        onApplyFilters={handleFilterApply}
        onResetFilters={handleFilterReset}
        onExport={() => handleExportDisabled("Download/export is currently disabled.")}
        onPrint={() => window.print()}
        page={page}
        perPage={PER}
        onPageChange={setPage}
        mobileCardMapping={cfg.mobileCardMapping}
        emptyLabel={`No ${entityName.toLowerCase()}s found.`}
        filteredEmptyLabel={`No matching ${entityName.toLowerCase()}s. Try adjusting your search or filters.`}
        tabs={tabDefs.length > 1 ? tabDefs : undefined}
        activeTab={tabDefs.length > 1 ? activeStatusTab : undefined}
        onTabChange={tabDefs.length > 1 ? (id) => { setActiveStatusTab(id); setPage(1); } : undefined}
      />

      <DynamicDetailsDrawer
        open={drawer !== null}
        onClose={handleDrawerClose}
        title={
          cfg.drawerTitle ??
          (drawer
            ? drawer.meeting_title
              ? "Meeting Details"
              : drawer.agenda_title
              ? "Agenda Item Details"
              : drawer.board_pack_title ?? drawer.pack_title
              ? "Board Pack Details"
              : drawer.minutes_id ?? drawer.minutes_title
              ? "Minutes Details"
              : drawer.document_name
              ? "Document Details"
              : drawer.decision_title
              ? "Decision Details"
              : drawer.resolution_title
              ? "Resolution Details"
              : drawer.action_title
              ? "Action Item Details"
              : drawer.body_name
              ? "Governance Body Details"
              : drawer.group_name
              ? "Participant Group Details"
              : drawer.user_name ?? drawer.name
              ? "User Details"
              : `${entityName} Details`
            : `${entityName} Details`)
        }
        columns={drawerColumns}
        rowData={drawer}
        showActions={true}
        extraFooterActions={
          <>
            {(drawer && cfg.drawerActionsResolver ? cfg.drawerActionsResolver(drawer) : cfg.drawerActions)?.map((action) => {
              const handleClick = () => {
                // These action IDs always use GenPage's internal modal state
                if (["edit", "continue_setup", "create_next_meeting", "post_meeting_review"].includes(action.id)) {
                  handleActionClick(action.id, drawer!);
                } else if (cfg.onCustomAction) {
                  cfg.onCustomAction(action.id, drawer!);
                  setDrawer(null);
                } else {
                  handleActionClick(action.id, drawer!);
                }
              };
              return (
                <SecondaryButton
                  key={action.id}
                  onClick={handleClick}
                  disabled={action.enabled === false}
                  title={action.enabled === false ? (action.disabledReason ?? undefined) : undefined}
                  style={action.color ? { color: action.color, borderColor: action.color } : undefined}
                >
                  {action.label}
                </SecondaryButton>
              );
            })}
          </>
        }
      />

      {/* Edit modal */}
      {cfg.entryBtn && editRow && (() => {
        const isMultiStep = !!(cfg.formSteps && cfg.formSteps.length > 1);
        const isLastStep = !isMultiStep || entryStep === (cfg.formSteps?.length ?? 1) - 1;
        const closeEdit = () => { setEditRow(null); setEntryStep(0); setStepValues({}); };
        return (
          <AppModal
            open={editRow !== null}
            title={`Edit ${entityName} — ${String(editRow.meeting_title ?? editRow.agenda_title ?? editRow.document_name ?? editRow.name ?? editRow.document_no ?? editRow.id ?? "")}`}
            subtitle={cfg.wizardSubtitle}
            onClose={closeEdit}
            fullPage={isMultiStep}
            steps={cfg.formSteps}
            stepIcons={cfg.stepIcons}
            stepShortLabels={cfg.formShortSteps}
            currentStep={entryStep}
            onStepClick={(s) => setEntryStep(s)}
            footer={
              <>
                <SecondaryButton style={{ marginRight: "auto" }} type="button" onClick={closeEdit}>Cancel</SecondaryButton>
                {isMultiStep && entryStep > 0 && (
                  <SecondaryButton type="button" onClick={() => setEntryStep(s => Math.max(0, s - 1))}>Back</SecondaryButton>
                )}
                {isLastStep ? (
                  <PrimaryButton type="submit" form="entry-form-edit">Save Changes</PrimaryButton>
                ) : (
                  <PrimaryButton type="submit" form="entry-form-edit">Continue</PrimaryButton>
                )}
              </>
            }
          >
            <EntryForm
              formId="entry-form-edit"
              onClose={closeEdit}
              initialValues={{ ...buildInitialValuesFromRow(editRow, entryFields), ...stepValues }}
              onSubmit={(values) => {
                const merged = { ...stepValues, ...values };
                setRows(prev => prev.map(r => r === editRow ? { ...r, ...createGenericRow(merged, entryFields, rows) } : r));
                cfg.onRowUpdate?.(String(editRow.id ?? ""), merged as Record<string, unknown>);
                closeEdit();
                toast.success(`${entityName} updated.`);
              }}
              onNext={(values) => {
                setStepValues(prev => ({ ...prev, ...values }));
                setEntryStep(s => s + 1);
              }}
              onBack={() => setEntryStep(s => Math.max(0, s - 1))}
              fields={entryFields}
              submitLabel={"Save Changes"}
              visibleStep={cfg.formSteps ? entryStep : undefined}
              isFirstStep={entryStep === 0}
              isLastStep={isLastStep}
              sections={cfg.sections}
              customStepRenderer={
                cfg.reviewRenderer && entryStep === (cfg.formSteps?.length ?? 1) - 1
                  ? (values, onChange) => { void onChange; return cfg.reviewRenderer!(values, (s) => setEntryStep(s)); }
                  : cfg.stepRenderers?.[entryStep]
                    ? cfg.stepRenderers[entryStep]
                    : undefined
              }
            />
          </AppModal>
        );
      })()}

      {/* Delete confirmation */}
      {deleteRow !== null && (
        <SConfirmModal
          title={`Delete ${entityName}`}
          message={`Are you sure you want to delete this ${entityName.toLowerCase()}? This action cannot be undone.`}
          confirmLabel={"Delete"}
          onConfirm={() => {
            setRows(prev => prev.filter(r => r !== deleteRow));
            setDeleteRow(null);
            toast.success(`${entityName} deleted.`);
          }}
          onClose={() => setDeleteRow(null)}
          danger
        />
      )}

      {/* Approve modal */}
      <AppModal
        open={approveRow !== null}
        title={`Approve ${entityName}`}
        size="sm"
        onClose={() => setApproveRow(null)}
        footer={
          <>
            <SecondaryButton style={{ marginRight: "auto" }} onClick={() => setApproveRow(null)}>
              {"Cancel"}
            </SecondaryButton>
            <SecondaryButton onClick={() => {
              cfg.onRowUpdate?.(String(approveRow!.id ?? ""), { approval_status: "Approved", approval_remark: approveRemark });
              setRows(prev => prev.map(r => r === approveRow ? { ...r, approval_status: "Approved", approval_remark: approveRemark } : r));
              setApproveRow(null);
              toast.success(`${entityName} approved.`);
            }} style={{ background: "var(--color-success, #22c55e)", color: "#fff", border: "none" }}>
              {"Approve"}
            </SecondaryButton>
          </>
        }
      >
        <div style={{ padding: "16px 0" }}>
          <AppTextArea
            id="approve-remark"
            label={"Approval Remarks (optional)"}
            value={approveRemark}
            onChange={setApproveRemark}
            rows={3}
          />
        </div>
      </AppModal>

      {/* Reject modal */}
      <AppModal
        open={rejectRow !== null}
        title={`Reject ${entityName}`}
        size="sm"
        onClose={() => setRejectRow(null)}
        footer={
          <>
            <SecondaryButton style={{ marginRight: "auto" }} onClick={() => setRejectRow(null)}>
              {"Cancel"}
            </SecondaryButton>
            <SecondaryButton onClick={() => {
              if (rejectReason.trim().length < 5) {
                setRejectError("Please provide a reason (at least 5 characters)");
                return;
              }
              const updated = { ...rejectRow!, approval_status: "Rejected", rejection_reason: rejectReason };
              setRows(prev => prev.map(r => r === rejectRow ? updated : r));
              cfg.onRowUpdate?.(String(rejectRow!.id ?? ""), { approval_status: "Rejected", rejection_reason: rejectReason });
              setRejectRow(null);
              toast.success(`${entityName} rejected.`);
            }} style={{ background: "var(--color-error, #ef4444)", color: "#fff", border: "none" }}>
              {"Reject"}
            </SecondaryButton>
          </>
        }
      >
        <div style={{ padding: "16px 0" }}>
          <AppTextArea
            id="reject-reason"
            label={"Rejection Reason *"}
            value={rejectReason}
            onChange={v => { setRejectReason(v); if (v.trim().length >= 5) setRejectError(""); }}
            rows={3}
            error={rejectError}
          />
        </div>
      </AppModal>

      {/* Request Revision modal */}
      <AppModal
        open={revisionRow !== null}
        title={`Request Revision — ${entityName}`}
        size="sm"
        onClose={() => setRevisionRow(null)}
        footer={
          <>
            <SecondaryButton style={{ marginRight: "auto" }} onClick={() => setRevisionRow(null)}>
              {"Cancel"}
            </SecondaryButton>
            <SecondaryButton onClick={() => {
              if (revisionInstructions.trim().length < 10) {
                setRevisionError("Please provide revision instructions (at least 10 characters)");
                return;
              }
              setRows(prev => prev.map(r => r === revisionRow ? { ...r, approval_status: "Revision Requested" } : r));
              setRevisionRow(null);
              toast.success("Revision requested");
            }} style={{ background: "var(--color-warning, #f59e0b)", color: "#fff", border: "none" }}>
              {"Request Revision"}
            </SecondaryButton>
          </>
        }
      >
        <div style={{ padding: "16px 0" }}>
          <AppTextArea
            id="revision-instructions"
            label={"Revision Instructions *"}
            value={revisionInstructions}
            onChange={v => { setRevisionInstructions(v); if (v.trim().length >= 10) setRevisionError(""); }}
            rows={4}
            error={revisionError}
          />
        </div>
      </AppModal>

      {/* Cancel modal */}
      <AppModal
        open={cancelRow !== null}
        title={`Cancel ${entityName}`}
        size="sm"
        onClose={() => setCancelRow(null)}
        footer={
          <>
            <SecondaryButton style={{ marginRight: "auto" }} onClick={() => setCancelRow(null)}>
              Close
            </SecondaryButton>
            <SecondaryButton onClick={() => {
              if (cancelReason.trim().length < 5) {
                setCancelError("Please provide a reason (at least 5 characters)");
                return;
              }
              setRows(prev => prev.map(r => r === cancelRow ? { ...r, approval_status: "Cancelled", status: "Cancelled" } : r));
              setCancelRow(null);
              toast.success(`${entityName} cancelled.`);
            }} style={{ background: "var(--color-error, #ef4444)", color: "#fff", border: "none" }}>
              Confirm Cancellation
            </SecondaryButton>
          </>
        }
      >
        <div style={{ padding: "16px 0" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "0.75rem" }}>
            This will mark this {entityName.toLowerCase()} as <strong>Cancelled</strong> and cannot be undone.
          </p>
          <AppTextArea
            id="cancel-reason"
            label="Cancellation Reason *"
            value={cancelReason}
            onChange={v => { setCancelReason(v); if (v.trim().length >= 5) setCancelError(""); }}
            rows={3}
            error={cancelError}
          />
        </div>
      </AppModal>

      {/* Postpone modal */}
      <AppModal
        open={postponeRow !== null}
        title={`Postpone ${entityName}`}
        size="sm"
        onClose={() => setPostponeRow(null)}
        footer={
          <>
            <SecondaryButton style={{ marginRight: "auto" }} onClick={() => setPostponeRow(null)}>
              Close
            </SecondaryButton>
            <SecondaryButton onClick={() => {
              if (postponeReason.trim().length < 5) {
                setPostponeError("Please provide a reason (at least 5 characters)");
                return;
              }
              setRows(prev => prev.map(r => r === postponeRow ? { ...r, approval_status: "Postponed", status: "Postponed" } : r));
              setPostponeRow(null);
              toast.success(`${entityName} postponed.`);
            }} style={{ background: "var(--color-warning, #f59e0b)", color: "#fff", border: "none" }}>
              Confirm Postponement
            </SecondaryButton>
          </>
        }
      >
        <div style={{ padding: "16px 0" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "0.75rem" }}>
            This will mark this {entityName.toLowerCase()} as <strong>Postponed</strong>. It can be rescheduled later.
          </p>
          <AppTextArea
            id="postpone-reason"
            label="Postponement Reason *"
            value={postponeReason}
            onChange={v => { setPostponeReason(v); if (v.trim().length >= 5) setPostponeError(""); }}
            rows={3}
            error={postponeError}
          />
        </div>
      </AppModal>

      {/* Create Next Meeting modal */}
      {createNextRow && cfg.formFields && (() => {
        const isMultiStep = !!(cfg.formSteps && cfg.formSteps.length > 1);
        const isLastStep = !isMultiStep || entryStep === (cfg.formSteps?.length ?? 1) - 1;
        const closeNext = () => { setCreateNextRow(null); setEntryStep(0); setStepValues({}); };
        return (
          <AppModal
            open={createNextRow !== null}
            title="Create Next Meeting"
            subtitle={cfg.wizardSubtitle}
            onClose={closeNext}
            fullPage={isMultiStep}
            steps={cfg.formSteps}
            stepIcons={cfg.stepIcons}
            stepShortLabels={cfg.formShortSteps}
            currentStep={entryStep}
            onStepClick={(s) => setEntryStep(s)}
            footer={
              <>
                <SecondaryButton style={{ marginRight: "auto" }} type="button" onClick={closeNext}>Cancel</SecondaryButton>
                {isMultiStep && entryStep > 0 && (
                  <SecondaryButton type="button" onClick={() => setEntryStep(s => Math.max(0, s - 1))}>Back</SecondaryButton>
                )}
                {isLastStep ? (
                  <PrimaryButton type="submit" form="entry-form-next-meeting">Create Meeting</PrimaryButton>
                ) : (
                  <PrimaryButton type="submit" form="entry-form-next-meeting">Continue</PrimaryButton>
                )}
              </>
            }
          >
            <EntryForm
              formId="entry-form-next-meeting"
              fields={entryFields}
              initialValues={(() => {
                const resolveSelectVal = (fieldKey: string, rawVal: string): string => {
                  const field = entryFields.find(f => f.key === fieldKey);
                  if (!field || !Array.isArray(field.options) || field.options.length === 0 || typeof field.options[0] !== "object") return rawVal;
                  const opts = field.options as { value: string; label: string }[];
                  if (opts.some(o => o.value === rawVal)) return rawVal;
                  const match = opts.find(o => o.label === rawVal || o.label.startsWith(rawVal + " —") || o.label.startsWith(rawVal + " ("));
                  return match ? match.value : "";
                };
                return {
                  committee:       resolveSelectVal("committee",   String(createNextRow.committee ?? "")),
                  meeting_type:    String(createNextRow.meeting_type ?? ""),
                  chairperson:     resolveSelectVal("chairperson", String(createNextRow.chairperson ?? "")),
                  secretary:       resolveSelectVal("secretary",   String(createNextRow.secretary ?? "")),
                  organizer:       resolveSelectVal("organizer",   String(createNextRow.submitted_by ?? "")),
                  language:        String(createNextRow.language ?? "English"),
                  confidentiality: String(createNextRow.confidentiality ?? "Confidential"),
                  mode:            String(createNextRow.meeting_mode ?? createNextRow.mode ?? "Physical"),
                  venue:           String(createNextRow.venue ?? ""),
                };
              })()}
              onClose={closeNext}
              onSubmit={(values) => {
                const merged = { ...stepValues, ...values };
                handleEntrySubmit(merged);
                closeNext();
              }}
              onNext={(values) => {
                setStepValues(prev => ({ ...prev, ...values }));
                setEntryStep(s => s + 1);
              }}
              onBack={() => setEntryStep(s => Math.max(0, s - 1))}
              visibleStep={cfg.formSteps ? entryStep : undefined}
              isFirstStep={entryStep === 0}
              isLastStep={isLastStep}
              sections={cfg.sections}
              customStepRenderer={
                cfg.reviewRenderer && entryStep === (cfg.formSteps?.length ?? 1) - 1
                  ? (values, onChange) => { void onChange; return cfg.reviewRenderer!(values, (s) => setEntryStep(s)); }
                  : cfg.stepRenderers?.[entryStep]
                    ? cfg.stepRenderers[entryStep]
                    : undefined
              }
            />
          </AppModal>
        );
      })()}

      {/* Post-Meeting Effectiveness Review modal */}
      {reviewRow && (
        <AppModal
          open={reviewRow !== null}
          title="Post-Meeting Effectiveness Review"
          onClose={() => { setReviewRow(null); setReviewStep(0); }}
          size="lg"
          footer={
            <>
              <SecondaryButton style={{ marginRight: "auto" }} type="button" onClick={() => { setReviewRow(null); setReviewStep(0); }}>Cancel</SecondaryButton>
              <PrimaryButton type="submit" form="entry-form-review">Submit Review</PrimaryButton>
            </>
          }
        >
          <EntryForm
            formId="entry-form-review"
            fields={[
              { key: "related_meeting",       label: "Meeting Reference",        type: "text",     required: true, span: true, defaultValue: String(reviewRow.meeting_id ?? reviewRow.id ?? "") },
              { key: "reviewer_name",         label: "Your Name",                type: "text" },
              { key: "anonymous",             label: "Submit Anonymously",       type: "toggle",   defaultValue: false },
              { key: "preparation_rating",    label: "Meeting Preparation",      type: "select",   required: true, options: ["1 - Very Poor", "2 - Poor", "3 - Satisfactory", "4 - Good", "5 - Excellent"], defaultValue: "4 - Good" },
              { key: "board_pack_quality",    label: "Board Pack Quality",       type: "select",   required: true, options: ["1 - Very Poor", "2 - Poor", "3 - Satisfactory", "4 - Good", "5 - Excellent"], defaultValue: "4 - Good" },
              { key: "agenda_relevance",      label: "Agenda Relevance",         type: "select",   required: true, options: ["1 - Very Poor", "2 - Poor", "3 - Satisfactory", "4 - Good", "5 - Excellent"], defaultValue: "4 - Good" },
              { key: "time_management",       label: "Time Management",          type: "select",   required: true, options: ["1 - Very Poor", "2 - Poor", "3 - Satisfactory", "4 - Good", "5 - Excellent"], defaultValue: "3 - Satisfactory" },
              { key: "discussion_quality",    label: "Quality of Discussion",    type: "select",   required: true, options: ["1 - Very Poor", "2 - Poor", "3 - Satisfactory", "4 - Good", "5 - Excellent"], defaultValue: "4 - Good" },
              { key: "decision_clarity",      label: "Clarity of Decisions",     type: "select",   required: true, options: ["1 - Very Poor", "2 - Poor", "3 - Satisfactory", "4 - Good", "5 - Excellent"], defaultValue: "4 - Good" },
              { key: "technology_performance",label: "Technology / Venue",       type: "select",   options: ["1 - Very Poor", "2 - Poor", "3 - Satisfactory", "4 - Good", "5 - Excellent"], defaultValue: "4 - Good" },
              { key: "overall_rating",        label: "Overall Meeting Rating",   type: "select",   required: true, options: ["1 - Very Poor", "2 - Poor", "3 - Satisfactory", "4 - Good", "5 - Excellent"], defaultValue: "4 - Good" },
              { key: "comments",              label: "Additional Comments",      type: "textarea", span: true, rows: 4, placeholder: "Any further observations or suggestions for improvement..." },
            ]}
            initialValues={{ related_meeting: String(reviewRow.meeting_id ?? reviewRow.id ?? "") }}
            onClose={() => { setReviewRow(null); setReviewStep(0); }}
            onSubmit={() => {
              setReviewRow(null);
              setReviewStep(0);
              toast.success("Effectiveness review submitted. Thank you for your feedback.");
            }}
            submitLabel="Submit Review"
          />
        </AppModal>
      )}

      {/* Entry modal */}
      {cfg.entryBtn && (() => {
        const isMultiStep = !!(cfg.formSteps && cfg.formSteps.length > 1);
        const isLastStep = !isMultiStep || entryStep === (cfg.formSteps?.length ?? 1) - 1;
        const closeEntry = () => {
          setModal(null); setEntryStep(0); setStepValues({});
          setWizardDraftId(null); latestEntryValues.current = {};
        };
        return (
          <AppModal
            open={modal === "entry"}
            title={cfg.entryBtn ?? resolvedTitle}
            subtitle={cfg.wizardSubtitle}
            onClose={closeEntry}
            fullPage={isMultiStep}
            steps={cfg.formSteps}
            stepIcons={cfg.stepIcons}
            stepShortLabels={cfg.formShortSteps}
            currentStep={entryStep}
            onStepClick={(s) => setEntryStep(s)}
            footer={
              <>
                <SecondaryButton style={{ marginRight: "auto" }} type="button" onClick={closeEntry}>Cancel</SecondaryButton>
                {isMultiStep && entryStep > 0 && (
                  <SecondaryButton type="button" onClick={() => setEntryStep(s => Math.max(0, s - 1))}>Back</SecondaryButton>
                )}
                {cfg.onSaveDraft && (
                  <SecondaryButton type="button" onClick={() => {
                    const merged = { ...stepValues, ...latestEntryValues.current, _current_step: entryStep };
                    const result = cfg.onSaveDraft!(merged, wizardDraftId ?? undefined);
                    if (typeof result === "string" && result) setWizardDraftId(result);
                    closeEntry();
                  }}>Save Draft</SecondaryButton>
                )}
                {isLastStep ? (
                  <PrimaryButton type="submit" form="entry-form-create">{cfg.lastStepSubmitLabel ?? "Save"}</PrimaryButton>
                ) : (
                  <PrimaryButton type="submit" form="entry-form-create">Continue</PrimaryButton>
                )}
              </>
            }
          >
            <EntryForm
              formId="entry-form-create"
              onClose={closeEntry}
              onSubmit={(values) => {
                const merged = { ...stepValues, ...values };
                if (wizardDraftId) merged._draft_meeting_id = wizardDraftId;
                handleEntrySubmit(merged);
                setEntryStep(0);
                setStepValues({});
                setWizardDraftId(null);
              }}
              onNext={(values) => {
                setStepValues(prev => ({ ...prev, ...values }));
                setEntryStep(s => s + 1);
              }}
              onBack={() => setEntryStep(s => Math.max(0, s - 1))}
              fields={entryFields}
              visibleStep={cfg.formSteps ? entryStep : undefined}
              isFirstStep={entryStep === 0}
              isLastStep={isLastStep}
              sections={cfg.sections}
              onValuesSync={(v) => { latestEntryValues.current = v; }}
              customStepRenderer={
                cfg.reviewRenderer && entryStep === (cfg.formSteps?.length ?? 1) - 1
                  ? (values, onChange) => { void onChange; return cfg.reviewRenderer!(values, (s) => setEntryStep(s)); }
                  : cfg.stepRenderers?.[entryStep]
                    ? cfg.stepRenderers[entryStep]
                    : undefined
              }
            />
          </AppModal>
        );
      })()}

      {/* Extra btn modals — each gets its own form fields based on formKind or explicit formFields */}
      {cfg.extraBtns?.map(b => {
        const fields: FormField[] = (b.formFields as FormField[] | undefined)?.length
          ? (b.formFields as FormField[])
          : b.formKind === "psr-entry"
            ? buildPsrEntryFields()
            : b.formKind === "psr-bulk-entry"
              ? buildPsrBulkEntryFields()
              : [
                  { key: "committee",   label: "Committee",    type: "select",   options: CIRCLES },
                  { key: "meeting_year",label: "Meeting Year", type: "select",   options: AY_OPTS },
                  { key: "attachments", label: "Attachments",  type: "file",     span: true, maxFiles: 5, maxSizeMB: 2, accept: [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".xls", ".xlsx"], helper: "Upload supporting documents" },
                  { key: "remarks",     label: "Remarks",      type: "textarea", span: true },
                ];
        const extraFormId = `entry-form-extra-${b.id}`;
        return (
          <AppModal
            key={b.id}
            open={modal === `extra:${b.id}`}
            title={b.formTitle ?? b.label}
            onClose={() => setModal(null)}
            footer={
              <>
                <SecondaryButton style={{ marginRight: "auto" }} type="button" onClick={() => setModal(null)}>Cancel</SecondaryButton>
                <PrimaryButton type="submit" form={extraFormId}>{b.submitLabel ?? "Save"}</PrimaryButton>
              </>
            }
          >
            <EntryForm
              formId={extraFormId}
              onClose={() => setModal(null)}
              onSubmit={handleExtraBtnSubmit(b, fields)}
              fields={fields}
            />
          </AppModal>
        );
      })}

    </div>
  );
}

export { GeneratedTablePage as GenPage };
