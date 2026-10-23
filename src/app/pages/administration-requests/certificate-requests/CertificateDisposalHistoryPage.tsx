import { GenPage } from "../../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef } from "../../modulePageUtils";
import { certDisposalRows, TIN_NAME, fc, BADGE, BASE_FILTERS } from "../../modulePageUtils";
import { ROW_VIEW, VIEW } from "../../../data/modulePageConfigs";
import { WORKFLOW_HISTORY_DRAWER_COLS } from "../../boardMeetingDrawerSchemas";

export function CertificateDisposalHistoryPage() {
  const kpis: KpiDef[] = [
    { label: "Total Executions", value: String(certDisposalRows.length), tone: "primary" },
    { label: "Completed", value: String(certDisposalRows.filter((r) => r.disposal_status === "Disposed").length), tone: "success" },
    { label: "In Progress", value: String(certDisposalRows.filter((r) => r.disposal_status === "Pending").length), tone: "warning" },
    { label: "Failed", value: String(certDisposalRows.filter((r) => r.disposal_status === "Rejected").length), tone: "error" },
  ];

  const cfg: PageCfg = {
    title: "Workflow History",
    titleKey: "workflowHistory.title",
    desc: "View a complete audit log of all workflow executions, approvals, and automated processes.",
    descKey: "workflowHistory.desc",
    cols: [
      fc("document_no", "Workflow", { headerKey: "headers.workflow" }),
      fc("document_type", "Workflow Type", { headerKey: "headers.workflowType" }),
      fc("issued_to", "Record", { headerKey: "headers.record" }),
      fc("name", "Initiated By", { headerKey: "headers.initiatedBy" }),
      fc("dispatch_date", "Start Date", { headerKey: "headers.startDate" }),
      fc("dispatch_method", "Duration", { headerKey: "headers.duration" }),
      BADGE("dispatch_status", "Status"),
    ],
    mobileCardMapping: { primary: "document_no", meta: ["document_type", "issued_to"], status: "dispatch_status", date: "dispatch_date" },
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerActions: VIEW,
    drawerTitle: "Workflow Execution Details",
    drawerCols: WORKFLOW_HISTORY_DRAWER_COLS,
    rows: certDisposalRows,
    kpis,
  };
  return <GenPage cfg={cfg} />;
}
