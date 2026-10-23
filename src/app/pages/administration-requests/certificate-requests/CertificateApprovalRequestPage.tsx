import { GenPage } from "../../../components/pages/GeneratedTablePage";
import type { PageCfg } from "../../modulePageUtils";
import { certDataRows, CIRCLE_TIN_NAME, fc, BADGE, BASE_FILTERS } from "../../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../../data/modulePageConfigs";
import { APPROVAL_RULE_DRAWER_COLS } from "../../boardMeetingDrawerSchemas";
import { APPROVAL_RULE_FORM_FIELDS } from "../../boardMeetingFormFields";
import { buildPageKpis } from "../../../utils/buildPageKpis";

export function CertificateApprovalRequestPage() {
  const kpis = buildPageKpis(certDataRows, {
    totalLabel: "Total Rules",
    statusField: "approval_status",
    statuses: [
      { value: "Active", label: "Active", tone: "success" },
      { value: "Pending", label: "Pending Review", tone: "warning" },
      { value: "Rejected", label: "Inactive", tone: "neutral" },
    ],
  });

  const cfg: PageCfg = {
    title: "Approval Rules",
    titleKey: "approvalRules.title",
    desc: "Define multi-stage approval workflows, required approvers, and escalation paths for board processes.",
    descKey: "approvalRules.desc",
    cols: [
      fc("document_no", "Rule Name", { headerKey: "headers.ruleName" }),
      fc("document_type", "Rule Type", { headerKey: "headers.ruleType" }),
      fc("name", "Applied To", { headerKey: "headers.appliedTo" }),
      fc("requested_by", "Required Approvers", { headerKey: "headers.requiredApprovers" }),
      fc("request_date", "Approval Mode", { headerKey: "headers.approvalMode" }),
      BADGE("approval_status", "Status"),
    ],
    mobileCardMapping: { primary: "document_no", meta: ["document_type", "name"], status: "approval_status", date: "request_date" },
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerActions: EDIT,
    drawerTitle: "Approval Rule Details",
    drawerCols: APPROVAL_RULE_DRAWER_COLS,
    rows: certDataRows,
    kpis,
    entryBtn: "Add Approval Rule",
    formFields: APPROVAL_RULE_FORM_FIELDS,
  };
  return <GenPage cfg={cfg} />;
}
