import { Archive } from "lucide-react";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import { ROW_VIEW, EDIT } from "../../data/modulePageConfigs";
import { RETENTION_RULE_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { LEGAL_HOLD_FORM_FIELDS, RETENTION_FORM_FIELDS } from "../boardMeetingFormFields";
import { BASE_FILTERS, BADGE, fc } from "../modulePageUtils";
import type { FilterDef, PageCfg } from "../modulePageUtils";
import { unverifiedRetentionLegalHoldsView } from "./retentionLegalHoldsEvidence";

export function RetentionLegalHoldsPage() {
  const evidence = unverifiedRetentionLegalHoldsView();
  const filters: FilterDef[] = [
    ...BASE_FILTERS,
    {
      key: "record_type",
      label: "Record Type",
      type: "select",
      options: ["All Types", "Retention Policy", "Legal Hold"],
      optionKeys: { "All Types": "options.allTypes" },
    },
    {
      key: "status",
      label: "Status",
      labelKey: "labels.status",
      type: "select",
      options: ["All Status", "Active", "Draft", "Under Review", "Archived", "Released"],
      optionKeys: { "All Status": "options.allStatus" },
    },
  ];

  const cfg: PageCfg = {
    title: "Retention & Legal Holds",
    titleKey: "navigation.administration.retentionLegalHolds",
    desc: "Review retention policies and legal-hold records. Legal holds must block purge, and missing policy must retain records.",
    cols: [
      fc("record_type", "Record Type"),
      fc("policy_name", "Policy Name"),
      fc("entity_type", "Entity Type"),
      fc("retention_period", "Retention Period"),
      fc("hold_title", "Legal Hold"),
      fc("record_scope", "Record Scope"),
      BADGE("status", "Status"),
    ],
    filters,
    actions: ROW_VIEW,
    drawerActions: EDIT,
    drawerTitle: "Retention and Legal Hold Details",
    drawerCols: RETENTION_RULE_DRAWER_COLS,
    rows: evidence.rows,
    dataError: evidence.unavailableReason,
    dataErrorTitle: "Retention and legal-hold records are unavailable",
    dataErrorDescription: evidence.unavailableReason,
    entryBtn: "Add Retention Policy",
    formFields: RETENTION_FORM_FIELDS,
    extraBtns: [
      {
        id: "legal-hold",
        label: "Add Legal Hold",
        icon: Archive,
        tone: "neutral",
        formTitle: "Add Legal Hold",
        formFields: LEGAL_HOLD_FORM_FIELDS,
      },
    ],
    mobileCardMapping: {
      primary: "policy_name",
      meta: ["record_type", "entity_type", "retention_period", "hold_title", "record_scope"],
      status: "status",
    },
  };

  return <GenPage cfg={cfg} />;
}
