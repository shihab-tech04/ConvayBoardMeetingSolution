import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  BarChart2, AlertCircle, CheckCircle, XCircle,
  RefreshCw, ChevronUp, ChevronDown, Users,
} from "lucide-react";
import { Button } from "../../components/buttons/Button";
import { AppModal } from "../../components/modals/AppModal";
import { EntryForm } from "../../components/forms/EntryForm";
import { PARTICIPANT_GROUP_FORM_FIELDS } from "../boardMeetingFormFields";
import { UnifiedDataTable } from "../../components/tables";
import { CollapsibleKpiSection } from "../../components/cards/CollapsibleKpiSection";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import type { ColDef, FilterDef, KpiDef, TableRow } from "../modulePageUtils";
import { fc, BADGE } from "../modulePageUtils";
import { ROW_VIEW } from "../../data/modulePageConfigs";
import {
  getApplications,
  getKpiTotals,
  approveApplication,
  rejectApplication,
  updateApplication,
  getApplicationById,
  SRConflictError,
  type SpecialRegistrationApplication,
  type SRKpiTotals,
  type SpecialRegistrationUpdatePayload,
} from "../../services/repositories/specialRegistrationRepository";
import { SpecialRegistrationDrawer } from "../../components/special-registration/SpecialRegistrationDrawer";
import { SpecialRegistrationEditModal } from "../../components/special-registration/SpecialRegistrationEditModal";

const PER_PAGE = 15;

const SPECIAL_REGISTRATION_MOBILE_MAPPING = {
  primary:    "applicantName",
  identifier: "applicationNumber",
  meta:       ["organization", "country", "email"],
  date:       "submittedAtLabel",
  status:     "statusLabel",
};

type FilterValues = {
  status: string;
  country: string;
  fromDate: string;
  toDate: string;
};

const EMPTY_FILTERS: FilterValues = {
  status: "", country: "", fromDate: "", toDate: "",
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusToDisplayValue(status: string): string {
  switch (status) {
    case "PENDING_REVIEW": return "pending review";
    case "APPROVED":       return "approved";
    case "REJECTED":       return "rejected";
    default:               return status.toLowerCase();
  }
}

export function SpecialRegistrationPage() {
  const currentUser          = useCurrentUser();

  // ── Data state ────────────────────────────────────────────────────────────
  const [applications, setApplications] = useState<SpecialRegistrationApplication[]>([]);
  const [total, setTotal]               = useState(0);
  const [kpis, setKpis]                 = useState<SRKpiTotals>({ total: 0, pendingReview: 0, approved: 0, rejected: 0 });
  const [loading, setLoading]           = useState(true);
  const [loadError, setLoadError]       = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [search, setSearch]                   = useState("");
  const [filterValues, setFilterValues]       = useState<FilterValues>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters]   = useState<FilterValues>(EMPTY_FILTERS);
  const [kpiOpen, setKpiOpen]                 = useState(true);
  const [addGroupOpen, setAddGroupOpen]       = useState(false);
  const [page, setPage]                       = useState(1);

  // ── Drawer / modal state ──────────────────────────────────────────────────
  const [selectedApp, setSelectedApp] = useState<SpecialRegistrationApplication | null>(null);
  const [editingApp, setEditingApp]   = useState<SpecialRegistrationApplication | null>(null);

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadData = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    try {
      const result = getApplications({
        page,
        perPage: PER_PAGE,
        search,
        status:   appliedFilters.status   || undefined,
        country:  appliedFilters.country  || undefined,
        fromDate: appliedFilters.fromDate || undefined,
        toDate:   appliedFilters.toDate   || undefined,
      });
      setApplications(result.items);
      setTotal(result.total);
      setKpis(getKpiTotals());
    } catch {
      setLoadError(true);
      toast.error("Failed to load applications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, search, appliedFilters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearchChange = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);

  // ── Filters ───────────────────────────────────────────────────────────────
  const handleFilterChange = useCallback((k: string, v: string) => {
    setFilterValues(prev => ({ ...prev, [k]: v }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({ ...filterValues });
    setPage(1);
  }, [filterValues]);

  const handleResetFilters = useCallback(() => {
    setFilterValues(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  }, []);

  // ── Decision callbacks ────────────────────────────────────────────────────
  const handleApprove = useCallback(async (
    appId: string,
    payload: { officerId: string; officerName: string; officerDesignation: string; approvalNote?: string }
  ) => {
    try {
      const updated = approveApplication(appId, payload);
      setApplications(prev => prev.map(a => a.id === appId ? updated : a));
      setSelectedApp(updated);
      setKpis(getKpiTotals());
    } catch (err) {
      if (err instanceof SRConflictError) {
        toast.error("This application was already processed. Refreshing.");
        loadData();
        return;
      }
      throw err;
    }
  }, [loadData]);

  const handleReject = useCallback(async (
    appId: string,
    payload: { officerId: string; officerName: string; officerDesignation: string; rejectionReason: string }
  ) => {
    try {
      const updated = rejectApplication(appId, payload);
      setApplications(prev => prev.map(a => a.id === appId ? updated : a));
      setSelectedApp(updated);
      setKpis(getKpiTotals());
    } catch (err) {
      if (err instanceof SRConflictError) {
        toast.error("This application was already processed. Refreshing.");
        loadData();
        return;
      }
      throw err;
    }
  }, [loadData]);

  // ── Edit handlers ─────────────────────────────────────────────────────────
  const handleEditOpen = useCallback(() => {
    setEditingApp(selectedApp);
    setSelectedApp(null);
  }, [selectedApp]);

  const handleEditSave = useCallback(async (
    appId: string,
    payload: SpecialRegistrationUpdatePayload,
    editorPayload: { editorId: string; editorName: string; editorDesignation: string }
  ) => {
    updateApplication(appId, payload, editorPayload);
    loadData();
    toast.success("Application updated successfully.");
    const updated = getApplicationById(appId);
    if (updated) setSelectedApp(updated);
    setEditingApp(null);
  }, [loadData]);

  // ── KPI defs ──────────────────────────────────────────────────────────────
  type AnyIcon = KpiDef["icon"];
  const kpiDefs: KpiDef[] = [
    { label: "Total Applications", value: String(kpis.total),         tone: "primary",  icon: BarChart2 as AnyIcon },
    { label: "Pending Review",     value: String(kpis.pendingReview), tone: "warning",  icon: AlertCircle as AnyIcon },
    { label: "Approved",           value: String(kpis.approved),      tone: "success",  icon: CheckCircle as AnyIcon },
    { label: "Rejected",           value: String(kpis.rejected),      tone: "error",    icon: XCircle as AnyIcon },
  ];

  // ── Column defs ───────────────────────────────────────────────────────────
  const cols: ColDef[] = [
    fc("applicationNumber", "Application No.", { truncate: "compact" }),
    fc("applicantName",    "Participant Name", { truncate: "normal"  }),
    fc("organization",     "Organisation",    { truncate: "normal"  }),
    fc("country",          "Country",         { truncate: "normal"  }),
    fc("email",            "Email",           { truncate: "long"    }),
    fc("submittedAtLabel",  "Submitted On",    { truncate: "compact" }),
    BADGE("statusLabel",    "Status"),
  ];

  // ── Filter defs ───────────────────────────────────────────────────────────
  const filterDefs: FilterDef[] = [
    {
      key: "status", label: "Status", type: "select",
      options: ["", "PENDING_REVIEW", "APPROVED", "REJECTED"],
      optionKeys: {
        "": "All Statuses",
        "PENDING_REVIEW": "Pending Review",
        "APPROVED": "Approved",
        "REJECTED": "Rejected",
      },
    },
    { key: "country",   label: "Residing Country",  type: "text" },
    { key: "fromDate",  label: "From Date", type: "date" },
    { key: "toDate",    label: "To Date",   type: "date" },
  ];

  // ── Row mapper ────────────────────────────────────────────────────────────
  const rows: TableRow[] = applications.map(app => ({
    _id: app.id,
    applicationNumber: app.applicationNumber,
    organization:      app.organization,
    applicantName:     app.applicantName,
    country:           app.country,
    email:             app.email,
    submittedAtLabel:  formatDate(app.submittedAt),
    statusLabel:       statusToDisplayValue(app.status),
  }));

  const handleRowClick = useCallback((row: TableRow) => {
    const app = applications.find(a => a.id === (row._id as string));
    if (app) setSelectedApp(app);
  }, [applications]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="table-page">
      {/* Page header */}
      <div className="table-page__header">
        <div>
          <h1 className="table-page__title">{"Participant Groups"}</h1>
          <p className="table-page__desc">{"Review and manage external participant group registrations."}</p>
        </div>
        <div className="table-page__actions">
          <Button variant="primary" size="lg" leadingIcon={Users} onClick={() => setAddGroupOpen(true)}>Add Participant Group</Button>
          <button
            type="button"
            className="table-page__kpi-toggle"
            onClick={() => setKpiOpen(o => !o)}
            aria-expanded={kpiOpen}
            aria-controls="kpi-section-panel"
          >
            {kpiOpen
              ? <><ChevronUp   size={13} strokeWidth={2} aria-hidden="true" />{"Hide Summary"}</>
              : <><ChevronDown size={13} strokeWidth={2} aria-hidden="true" />{"Show Summary"}</>
            }
          </button>
        </div>
      </div>

      {/* KPI panel */}
      <CollapsibleKpiSection kpis={kpiDefs} open={kpiOpen} />

      {/* Table */}
      <UnifiedDataTable
        title="All Applications"
        countLabel="applications"
        singularLabel="application"
        totalCount={total}
        cols={cols}
        rows={rows}
        actions={ROW_VIEW}
        onViewRow={handleRowClick}
        loading={loading}
        error={loadError ? "Failed to load applications. Please try again." : undefined}
        onRetry={loadData}
        search={search}
        searchPlaceholder="Search by application number, name, or organisation"
        onSearchChange={handleSearchChange}
        filterDefs={filterDefs}
        filterValues={filterValues}
        appliedFilters={appliedFilters}
        onFilterChange={handleFilterChange}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
        page={page}
        perPage={PER_PAGE}
        onPageChange={setPage}
        mobileCardMapping={SPECIAL_REGISTRATION_MOBILE_MAPPING}
        emptyLabel="No special registration applications have been submitted yet."
        filteredEmptyLabel="No applications match your search or filters."
        aria-label="Participant Groups"
      />

      {/* Details drawer */}
      {selectedApp && (
        <SpecialRegistrationDrawer
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onEdit={handleEditOpen}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {/* Add Participant Group modal */}
      {addGroupOpen && (
        <AppModal
          open
          title="Add Participant Group"
          onClose={() => setAddGroupOpen(false)}
          fullPage
        >
          <EntryForm
            fields={PARTICIPANT_GROUP_FORM_FIELDS}
            onClose={() => setAddGroupOpen(false)}
            onSubmit={() => { setAddGroupOpen(false); toast.success("Participant group added"); }}
          />
        </AppModal>
      )}

      {/* Edit modal */}
      {editingApp && (
        <SpecialRegistrationEditModal
          open
          application={editingApp}
          onClose={() => setEditingApp(null)}
          onSave={handleEditSave}
          editor={{
            editorId:          currentUser.employeeId,
            editorName:        currentUser.name,
            editorDesignation: currentUser.designation,
          }}
        />
      )}
    </div>
  );
}
