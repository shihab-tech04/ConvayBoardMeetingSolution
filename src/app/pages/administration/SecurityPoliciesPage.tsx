import { GenPage } from "../../components/pages/GeneratedTablePage";
import { ROW_VIEW, EDIT } from "../../data/modulePageConfigs";
import { SECURITY_POLICY_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { SECURITY_POLICY_FORM_FIELDS } from "../boardMeetingFormFields";
import { BASE_FILTERS, BADGE, fc } from "../modulePageUtils";
import type { FilterDef, PageCfg } from "../modulePageUtils";
import { unverifiedSecurityPoliciesView } from "./securityPoliciesEvidence";

export function SecurityPoliciesPage() {
  const evidence = unverifiedSecurityPoliciesView();
  const filters: FilterDef[] = [
    ...BASE_FILTERS,
    {
      key: "policy_type",
      label: "Policy Type",
      labelKey: "labels.type",
      type: "select",
      options: ["All Types", "Access Control", "Data Retention", "Encryption", "Authentication", "Authorization", "Audit"],
      optionKeys: { "All Types": "options.allTypes" },
    },
    {
      key: "status",
      label: "Status",
      labelKey: "labels.status",
      type: "select",
      options: ["All Status", "Active", "Draft", "Under Review", "Archived"],
      optionKeys: { "All Status": "options.allStatus" },
    },
  ];

  const cfg: PageCfg = {
    title: "Security Policies",
    titleKey: "navigation.administration.securityPolicies",
    desc: "Review configured security policies and their version and impact history.",
    cols: [
      fc("policy_name", "Policy Name"),
      fc("policy_type", "Policy Type"),
      fc("applies_to", "Applies To"),
      fc("review_date", "Last Reviewed"),
      fc("policy_owner", "Policy Owner"),
      BADGE("status", "Status"),
    ],
    filters,
    actions: ROW_VIEW,
    drawerActions: EDIT,
    drawerTitle: "Security Policy Details",
    drawerCols: SECURITY_POLICY_DRAWER_COLS,
    rows: evidence.rows,
    dataError: evidence.unavailableReason,
    dataErrorTitle: "Security policies are unavailable",
    dataErrorDescription: evidence.unavailableReason,
    entryBtn: "Add Security Policy",
    formFields: SECURITY_POLICY_FORM_FIELDS,
    mobileCardMapping: {
      primary: "policy_name",
      meta: ["policy_type", "applies_to", "policy_owner"],
      status: "status",
      date: "review_date",
    },
  };

  return <GenPage cfg={cfg} />;
}
