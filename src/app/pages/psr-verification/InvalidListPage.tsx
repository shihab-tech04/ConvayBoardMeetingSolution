import { useRef } from "react";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef, TableRow } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../data/modulePageConfigs";
import { GOV_BODY_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { useGovernanceRegistry, generateId, type GovernanceBody } from "../../data/boardMeetingData";
import { convayAuth } from "../../services/supabase/convayAuth";
import { createGovernanceBody, updateGovernanceBody, type GovernanceBodyGateway } from "./governanceBodyPersistence";
import { GOVERNANCE_BODY_FORM_FIELDS } from "../boardMeetingFormFields";

export function InvalidListPage() {
  const registry = useGovernanceRegistry();
  const pendingCreate = useRef<{ signature: string; id: string; created_at: string } | null>(null);
  const gateway: GovernanceBodyGateway = {
    list: async () => (await convayAuth.registry<GovernanceBody>("bms.govbodies", "list")).records.map(row => row.payload),
    create: async body => (await registry.add(body)) === true,
    update: async (id, patch) => (await registry.update(id, patch)) === true,
  };

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
    awaitCreateSave: true,
    // The shared GenPage awaits these promises. Do not let a modal close
    // before the server acknowledges and an independent SQL readback agrees.
    async onRowUpdate(id, values) {
      return updateGovernanceBody(id, values, gateway);
    },
    async onRowCreate(values) {
      const signature = JSON.stringify(values);
      if (!pendingCreate.current || pendingCreate.current.signature !== signature) {
        pendingCreate.current = {
          signature,
          id: generateId("GB", registry.items.map(g => g.body_id)),
          created_at: new Date().toISOString(),
        };
      }
      const identity = pendingCreate.current;
      await createGovernanceBody(values, identity, gateway);
      pendingCreate.current = null;
      return true;
    },
  };
  return <GenPage cfg={cfg} />;
}
