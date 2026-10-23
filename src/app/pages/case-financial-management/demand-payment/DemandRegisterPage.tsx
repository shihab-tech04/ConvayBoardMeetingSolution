import { GenPage } from "../../../components/pages/GeneratedTablePage";
import type { PageCfg } from "../../modulePageUtils";
import { demandRows, fc, BADGE, BASE_FILTERS } from "../../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../../data/modulePageConfigs";
import { buildPageKpis } from "../../../utils/buildPageKpis";
import { MEETING_TYPE_FORM_FIELDS } from "../../boardMeetingFormFields";

export function DemandRegisterPage() {

  const kpis = buildPageKpis(demandRows, {
    totalLabel: "Total Meeting Types",
    statusField: "payment_status",
    statuses: [
      { value: "Paid", label: "Active", tone: "success" },
      { value: "Partially Paid", label: "Draft", tone: "warning" },
      { value: "Unpaid", label: "Inactive", tone: "error" },
    ],
    amountField: "approved_amount",
    amountLabel: "Total Duration (min)",
    amountTone: "neutral",
  });

  const cfg: PageCfg = {
    title: "Meeting Types",
    titleKey: "demandRegister.title",
    desc: "Configure meeting types for governance bodies and approval workflows.",
    descKey: "demandRegister.desc",
    cols: [
      fc("meeting_title",  "Meeting Type",       { headerKey: "headers.meetingTitle" }),
      fc("committee",      "Governance Body",    { headerKey: "headers.committee" }),
      fc("agenda_no",      "Type Code",          { headerKey: "headers.psrNo" }),
      fc("approved_amount","Default Duration",   { headerKey: "headers.amount" }),
      fc("disbursed_amount","Quorum Requirement",{ headerKey: "headers.totalEntry" }),
      BADGE("approval_status", "Status"),
    ],
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerActions: EDIT,
    rows: demandRows,
    entryBtn: "Add Meeting Type",
    formFields: MEETING_TYPE_FORM_FIELDS,
    kpis,
    mobileCardMapping: {
      primary: "meeting_title",
      identifier: "meeting_id",
      meta: ["committee", "agenda_no"],
      status: "approval_status",
      amount: "approved_amount"
    },
  };
  return <GenPage cfg={cfg} />;
}