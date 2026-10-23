import { GenPage } from "../../../components/pages/GeneratedTablePage";
import type { PageCfg } from "../../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../../data/modulePageConfigs";
import { QUORUM_RULE_FORM_FIELDS } from "../../boardMeetingFormFields";
import { QUORUM_RULE_DRAWER_COLS } from "../../boardMeetingDrawerSchemas";
import { useQuorumRuleRegistry, useGovernanceRegistry, generateId } from "../../../data/boardMeetingData";
import { buildPageKpis } from "../../../utils/buildPageKpis";
import { patchFormOptions } from "../../../utils/patchFormOptions";

export function DemandApprovalPage() {
  const registry = useQuorumRuleRegistry();
  const govReg = useGovernanceRegistry();
  const dynamicFields = patchFormOptions(QUORUM_RULE_FORM_FIELDS, {
    body_name: govReg.items.map(g => g.body_name),
    governance_body: govReg.items.map(g => g.body_name),
  });

  const rows = registry.items.map(r => ({
    ...r,
    id: r.id,
    agenda_no:       r.rule_id,
    name:            r.body_name,
    agenda_date:     r.calculation_basis,
    approved_amount: r.minimum_members,
    disbursed_amount:r.quorum_percent,
    outstanding:     r.created_at.slice(0, 10),
    approval_status: r.status,
  }));

  const kpis = buildPageKpis(rows, {
    totalLabel: "Total Rules",
    statusField: "approval_status",
    statuses: [
      { value: "Active",    label: "Active",          tone: "success" },
      { value: "Inactive",  label: "Inactive",        tone: "neutral" },
      { value: "Pending",   label: "Pending Review",  tone: "warning" },
    ],
  });

  const cfg: PageCfg = {
    title: "Quorum Rules",
    titleKey: "quorumRules.title",
    desc: "Define quorum requirements, minimum attendance thresholds, and meeting validity rules.",
    descKey: "quorumRules.desc",
    cols: [
      fc("agenda_no",       "Rule ID",           { headerKey: "headers.ruleName" }),
      fc("name",            "Governance Body",   { headerKey: "headers.governanceBody" }),
      fc("agenda_date",     "Calculation Basis", { headerKey: "headers.quorumType" }),
      fc("approved_amount", "Min. Members",      { headerKey: "headers.minMembers" }),
      fc("disbursed_amount","Quorum %",          { headerKey: "headers.minPercentage" }),
      fc("outstanding",     "Created",           { headerKey: "headers.effectiveDate" }),
      BADGE("approval_status", "Status"),
    ],
    mobileCardMapping: { primary: "name", meta: ["agenda_no", "agenda_date"], status: "approval_status", date: "outstanding" },
    filters:    BASE_FILTERS,
    actions:    ROW_VIEW,
    drawerActions: EDIT,
    drawerTitle: "Quorum Rule Details",
    drawerCols:  QUORUM_RULE_DRAWER_COLS,
    rows,
    kpis,
    entryBtn:  "Add Quorum Rule",
    formFields: dynamicFields,
    onRowCreate(values) {
      const rId = generateId("QR", registry.items.map(r => r.rule_id));
      registry.add({
        id: rId, rule_id: rId,
        governance_body_id: String(values.governance_body_id ?? rId),
        body_name:          String(values.body_name ?? values.governance_body ?? ""),
        quorum_percent:     String(values.quorum_percent ?? "50%"),
        calculation_basis:  String(values.calculation_basis ?? "Total Registered Members"),
        minimum_members:    String(values.minimum_members ?? "3"),
        exception_rules:    String(values.exception_rules ?? ""),
        status:             "Active",
        created_at:         new Date().toISOString(),
      } as never);
    },
    onRowUpdate(id, values) {
      registry.update(id, {
        body_name:         values.body_name         != null ? String(values.body_name)         : undefined,
        quorum_percent:    values.quorum_percent     != null ? String(values.quorum_percent)    : undefined,
        calculation_basis: values.calculation_basis  != null ? String(values.calculation_basis) : undefined,
        minimum_members:   values.minimum_members    != null ? String(values.minimum_members)   : undefined,
        exception_rules:   values.exception_rules    != null ? String(values.exception_rules)   : undefined,
        status:            values.approval_status    != null ? String(values.approval_status)   : undefined,
      } as never);
    },
  };
  return <GenPage cfg={cfg} />;
}
