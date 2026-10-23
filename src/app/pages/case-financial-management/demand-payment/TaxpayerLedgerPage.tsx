import { GenPage } from "../../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef } from "../../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../../data/modulePageConfigs";
import { VOTING_METHOD_FORM_FIELDS } from "../../boardMeetingFormFields";
import { VOTING_METHOD_DRAWER_COLS } from "../../boardMeetingDrawerSchemas";
import { useVotingMethodRegistry, generateId } from "../../../data/boardMeetingData";

export function TaxpayerLedgerPage() {
  const registry = useVotingMethodRegistry();

  const rows = registry.items.map(m => ({
    ...m,
    id: m.id,
    particulars:      m.method_name,
    reference:        m.method_id,
    name:             m.description,
    debit:            m.threshold,
    credit:           m.anonymous_voting === "Yes" ? "Anonymous" : "Open",
    transaction_date: m.created_at.slice(0, 10),
    balance:          m.status,
  }));

  const kpis: KpiDef[] = [
    { label: "Total Methods",  value: String(rows.length),                                           tone: "primary" },
    { label: "Active Methods", value: String(rows.filter(r => r.balance === "Active").length),       tone: "success" },
    { label: "Default Method", value: "Show of Hands",                                              tone: "neutral" },
    { label: "Anonymous",      value: String(registry.items.filter(m => m.anonymous_voting === "Yes").length), tone: "warning" },
  ];

  const cfg: PageCfg = {
    title: "Voting Methods",
    titleKey: "votingMethods.title",
    desc: "Configure voting procedures, majority rules, and eligible voter definitions for resolutions.",
    descKey: "votingMethods.desc",
    cols: [
      fc("particulars",      "Method Name",    { headerKey: "headers.methodName" }),
      fc("reference",        "Method ID",      { headerKey: "headers.methodType" }),
      fc("name",             "Description",    { headerKey: "headers.applicableTo" }),
      fc("debit",            "Threshold",      { headerKey: "headers.majorityRule" }),
      fc("credit",           "Voting Type",    { headerKey: "headers.eligibleVoters" }),
      fc("transaction_date", "Created",        { headerKey: "headers.lastUpdated" }),
      BADGE("balance", "Status"),
    ],
    mobileCardMapping: { primary: "particulars", meta: ["reference", "debit"], status: "balance", date: "transaction_date" },
    filters:    BASE_FILTERS,
    actions:    ROW_VIEW,
    drawerActions: EDIT,
    drawerTitle: "Voting Method Details",
    drawerCols:  VOTING_METHOD_DRAWER_COLS,
    rows,
    kpis,
    entryBtn:  "Add Voting Method",
    formFields: VOTING_METHOD_FORM_FIELDS,
    onRowCreate(values) {
      const mId = generateId("VM", registry.items.map(m => m.method_id));
      registry.add({
        id: mId, method_id: mId,
        method_name:       String(values.method_name       ?? ""),
        description:       String(values.description       ?? ""),
        supports_majority: String(values.supports_majority ?? "Yes"),
        threshold:         String(values.threshold         ?? "50%+1"),
        anonymous_voting:  String(values.anonymous_voting  ?? "No"),
        status:            "Active",
        created_at:        new Date().toISOString(),
      } as never);
    },
    onRowUpdate(id, values) {
      registry.update(id, {
        method_name:       values.method_name       != null ? String(values.method_name)       : undefined,
        description:       values.description       != null ? String(values.description)       : undefined,
        threshold:         values.threshold         != null ? String(values.threshold)         : undefined,
        anonymous_voting:  values.anonymous_voting  != null ? String(values.anonymous_voting)  : undefined,
        status:            values.balance           != null ? String(values.balance)           : undefined,
      } as never);
    },
  };
  return <GenPage cfg={cfg} />;
}
