import { GenPage } from "../../../components/pages/GeneratedTablePage";
import type { PageCfg } from "../../modulePageUtils";
import { certEditRows, TIN_NAME, fc, BADGE, BASE_FILTERS } from "../../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../../data/modulePageConfigs";
import { REVISION_RULE_DRAWER_COLS } from "../../boardMeetingDrawerSchemas";
import { REVIEW_RULE_FORM_FIELDS } from "../../boardMeetingFormFields";
import { buildPageKpis } from "../../../utils/buildPageKpis";

export function CertificateEditRequestPage() {
  const kpis = buildPageKpis(certEditRows, {
    totalLabel: "Total Rules",
    statusField: "edit_status",
    statuses: [
      { value: "Active", label: "Active", tone: "success" },
      { value: "Pending", label: "Pending Review", tone: "warning" },
      { value: "Rejected", label: "Inactive", tone: "neutral" },
    ],
  });

  const cfg: PageCfg = {
    title: "Review & Revision Rules",
    titleKey: "reviewRevisionRules.title",
    desc: "Configure document review cycles, revision workflows, and mandatory review requirements.",
    descKey: "reviewRevisionRules.desc",
    cols: [
      fc("document_no", "Rule Name", { headerKey: "headers.ruleName" }),
      fc("document_type", "Review Type", { headerKey: "headers.reviewType" }),
      fc("name", "Applied To", { headerKey: "headers.appliedTo" }),
      fc("edit_field", "Review Deadline", { headerKey: "headers.reviewDeadline" }),
      fc("requested_value", "Revision Cycles", { headerKey: "headers.revisionCycles" }),
      BADGE("edit_status", "Status"),
    ],
    mobileCardMapping: { primary: "document_no", meta: ["document_type", "name"], status: "edit_status" },
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerActions: EDIT,
    drawerTitle: "Revision Rule Details",
    drawerCols: REVISION_RULE_DRAWER_COLS,
    rows: certEditRows,
    kpis,
    entryBtn: "Add Review Rule",
    formFields: REVIEW_RULE_FORM_FIELDS,
  };
  return <GenPage cfg={cfg} />;
}
