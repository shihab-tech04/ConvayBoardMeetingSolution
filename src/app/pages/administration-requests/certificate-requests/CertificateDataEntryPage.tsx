import { GenPage } from "../../../components/pages/GeneratedTablePage";
import type { PageCfg } from "../../modulePageUtils";
import { certDataRows, CIRCLE_TIN_NAME, fc, BADGE, BASE_FILTERS } from "../../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../../data/modulePageConfigs";
import { WORKFLOW_DRAWER_COLS } from "../../boardMeetingDrawerSchemas";
import { buildPageKpis } from "../../../utils/buildPageKpis";
import { WORKFLOW_FORM_FIELDS } from "../../boardMeetingFormFields";

export function CertificateDataEntryPage() {

  const kpis = buildPageKpis(certDataRows, {
    totalLabel: "Total Entries",
    statusField: "approval_status",
    statuses: [
      { value: "Pending", label: "Pending", tone: "warning" },
      { value: "Approved", label: "Approved", tone: "success" },
      { value: "Rejected", label: "Rejected", tone: "error" },
      { value: "Issued", label: "Issued", tone: "neutral" },
    ],
  });

  const cfg: PageCfg = {
    title: "Workflow Definitions",
    titleKey: "dataEntryRequest.title",
    desc: "Define and manage approval workflows for meetings, documents, and resolutions.",
    descKey: "dataEntryRequest.desc",
    cols: [
      fc("meeting_title", "Workflow Name",   { headerKey: "headers.meetingTitle" }),
      fc("document_type", "Workflow Type",   { headerKey: "headers.type" }),
      fc("committee",     "Applies To",      { headerKey: "headers.committee" }),
      fc("requested_by",  "Workflow Owner",  { headerKey: "headers.submittedBy" }),
      fc("request_date",  "Last Updated",    { headerKey: "headers.date" }),
      BADGE("approval_status", "Status"),
    ],
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerActions: EDIT,
    drawerTitle: "Workflow Details",
    drawerCols: WORKFLOW_DRAWER_COLS,
    rows: certDataRows,
    kpis,
    entryBtn: "Add Workflow",
    formFields: WORKFLOW_FORM_FIELDS,
    mobileCardMapping: {
      primary: "meeting_title",
      identifier: "meeting_id",
      meta: ["committee", "document_type"],
      status: "approval_status",
      date: "request_date"
    },
  };
  return <GenPage cfg={cfg} />;
}