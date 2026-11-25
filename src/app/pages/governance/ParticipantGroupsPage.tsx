import { useGovernanceCreateRecovery } from "./governanceCreateRecovery";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, TableRow } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../data/modulePageConfigs";
import { PARTICIPANT_GROUP_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { buildPageKpis } from "../../utils/buildPageKpis";
import {
  useParticipantGroupRegistry,
  useGovernanceRegistry,
  generateId,
  type ParticipantGroup,
} from "../../data/boardMeetingData";
import { convayAuth } from "../../services/supabase/convayAuth";
import { createParticipantGroup, updateParticipantGroup, type ParticipantGroupGateway } from "./participantGroupPersistence";
import { PARTICIPANT_GROUP_FORM_FIELDS } from "../boardMeetingFormFields";

export function ParticipantGroupsPage() {
  const registry = useParticipantGroupRegistry();
  const govRegistry = useGovernanceRegistry();
  const recovery = useGovernanceCreateRecovery();
  const gateway: ParticipantGroupGateway = {
    list: async () => (await convayAuth.registry<ParticipantGroup>("bms.partgroups", "list")).records.map(row => row.payload),
    create: async group => (await registry.add(group)) === true,
    update: async (id, patch) => (await registry.update(id, patch)) === true,
  };

  // Derive governance body options from live registry
  const govBodyOptions = govRegistry.items.map(g => g.body_name);

  const rows: TableRow[] = registry.items.map((g: ParticipantGroup) => ({ ...g, id: g.id, committee: g.governance_body }));

  const kpis = buildPageKpis(rows, {
    totalLabel: "Total Groups",
    statusField: "status",
    statuses: [
      { value: "Active",   label: "Active",   tone: "success" },
      { value: "Inactive", label: "Inactive", tone: "neutral" },
    ],
  });
  const votingCount   = rows.filter(r => r.group_type === "Voting Members").length;
  const observerCount = rows.filter(r => String(r.group_type ?? "").includes("Observer")).length;
  kpis.push({ label: "Voting Groups",   value: String(votingCount),   tone: "primary" });
  kpis.push({ label: "Observer Groups", value: String(observerCount), tone: "warning" });

  // Dynamic form fields with governance body options from registry
  const dynamicFormFields = PARTICIPANT_GROUP_FORM_FIELDS.map(f =>
    f.key === "governance_body"
      ? { ...f, options: govBodyOptions.length > 0 ? govBodyOptions : f.options }
      : f
  );

  const cfg: PageCfg = {
    title: "Participant Groups",
    desc: "Define and manage participant groups, membership rules, and governance body assignments.",
    cols: [
      fc("group_name",     "Group Name",     { headerKey: "headers.meetingTitle" }),
      BADGE("group_type",  "Type"),
      fc("governance_body","Governance Body",{ headerKey: "headers.committee" }),
      fc("member_count",   "Members",        { headerKey: "headers.totalEntry" }),
      fc("quorum_rule",    "Quorum Rule",    { headerKey: "headers.reason" }),
      BADGE("status",      "Status"),
    ],
    mobileCardMapping: {
      primary:    "group_name",
      identifier: "group_id",
      meta:       ["governance_body"],
      status:     "status",
    },
    filters: [
      ...BASE_FILTERS,
      { key: "group_type",      label: "Type",            type: "select", options: ["Voting Members", "Non-Voting Observers", "Invitees", "Non-Voting Support", "Independent Members"] },
      { key: "governance_body", label: "Governance Body", type: "select", options: govBodyOptions.length > 0 ? govBodyOptions : ["Board of Directors", "Audit Committee"] },
      { key: "status",          label: "Status",          type: "select", options: ["Active", "Inactive"] },
    ],
    actions:       ROW_VIEW,
    drawerActions: EDIT,
    drawerTitle: "Participant Group Details",
    drawerCols: PARTICIPANT_GROUP_DRAWER_COLS,
    rows,
    kpis,
    entryBtn: "Add Participant Group",
    formFields: dynamicFormFields,
    awaitCreateSave: true,
    async onRowCreate(values) {
      const attempt = recovery.begin(values, () => generateId("PG", registry.items.map(g => g.group_id)));
      await createParticipantGroup(values, attempt, gateway, attempt);
      attempt.assertCurrent();
      if (attempt.recovered) await registry.refresh?.();
      recovery.complete(attempt);
      return true;
    },
    async onRowUpdate(id, values) {
      return updateParticipantGroup(id, values, gateway);
    },
  };

  return <GenPage cfg={cfg} />;
}
