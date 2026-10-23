import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef, TableRow } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../data/modulePageConfigs";
import { GOV_BODY_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { useGovernanceRegistry, generateId } from "../../data/boardMeetingData";
import { GOVERNANCE_BODY_FORM_FIELDS } from "../boardMeetingFormFields";

export function InvalidListPage() {
  const registry = useGovernanceRegistry();

  const rows: TableRow[] = registry.items.map(g => ({ ...g, id: g.id }));

  const kpis: KpiDef[] = [
    { label: "Total Bodies", value: String(rows.length),                                           tone: "primary" },
    { label: "Active",       value: String(rows.filter(r => r.status === "Active").length),        tone: "success" },
    { label: "Inactive",     value: String(rows.filter(r => r.status === "Inactive").length),      tone: "neutral" },
  ];

  const cfg: PageCfg = {
    title: "Governance Bodies",
    titleKey: "invalidList.title",
    desc: "Manage governance bodies, their membership, quorum rules, and meeting configuration.",
    descKey: "invalidList.desc",
    cols: [
      fc("body_name",          "Governance Body", { headerKey: "headers.meetingTitle" }),
      fc("body_type",          "Type",            { headerKey: "headers.meetingType" }),
      fc("chairperson",        "Chairperson",     { headerKey: "headers.submittedBy" }),
      fc("member_count",       "Members",         { headerKey: "headers.committee" }),
      fc("quorum_requirement", "Quorum Rule",     { headerKey: "headers.reason" }),
      fc("establishment_date", "Established",     { headerKey: "headers.date" }),
      BADGE("status",          "Status"),
    ],
    mobileCardMapping: {
      primary:    "body_name",
      identifier: "body_id",
      meta:       ["body_type", "chairperson", "secretary"],
      status:     "status",
      date:       "establishment_date",
    },
    filters:      BASE_FILTERS,
    actions:      ROW_VIEW,
    drawerActions: EDIT,
    drawerTitle: "Governance Body Details",
    drawerCols: GOV_BODY_DRAWER_COLS,
    rows,
    kpis,
    entryBtn:      "Add Governance Body",
    formFields:    GOVERNANCE_BODY_FORM_FIELDS,
    onRowUpdate(id, values) {
      registry.update(id, {
        body_name:          values.body_name          != null ? String(values.body_name)          : undefined,
        body_type:          values.body_type          != null ? String(values.body_type)          : undefined,
        chairperson:        values.chairperson        != null ? String(values.chairperson)        : undefined,
        secretary:          values.secretary          != null ? String(values.secretary)          : undefined,
        member_count:       values.member_count       != null ? String(values.member_count)       : undefined,
        quorum_requirement: values.quorum_requirement != null ? String(values.quorum_requirement) : undefined,
        voting_method:      values.voting_method      != null ? String(values.voting_method)      : undefined,
        establishment_date: values.establishment_date != null ? String(values.establishment_date) : undefined,
        mandate:            values.mandate            != null ? String(values.mandate)            : undefined,
        status:             values.status             != null ? String(values.status)             : undefined,
      } as never);
    },
    onRowCreate(values) {
      const gbId = generateId("GB", registry.items.map(g => g.body_id));
      registry.add({
        id:                 gbId,
        body_id:            gbId,
        body_name:          String(values.body_name ?? ""),
        body_type:          String(values.body_type ?? ""),
        chairperson:        String(values.chairperson ?? ""),
        secretary:          String(values.secretary ?? ""),
        member_count:       String(values.member_count ?? "0"),
        quorum_requirement: String(values.quorum_requirement ?? ""),
        voting_method:      String(values.voting_method ?? ""),
        establishment_date: String(values.establishment_date ?? ""),
        mandate:            String(values.mandate ?? ""),
        status:             String(values.status ?? "Active"),
        created_at:         new Date().toISOString(),
      });
    },
  };
  return <GenPage cfg={cfg} />;
}
