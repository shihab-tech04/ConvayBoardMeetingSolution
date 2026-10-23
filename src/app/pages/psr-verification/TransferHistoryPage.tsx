import { Briefcase } from "lucide-react";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../data/modulePageConfigs";
import { DESIGNATION_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { buildPageKpis } from "../../utils/buildPageKpis";
import { DESIGNATION_FORM_FIELDS, POSITION_FORM_FIELDS } from "../boardMeetingFormFields";
import { useGovernanceMembershipRegistry, useGovernanceRegistry, generateId } from "../../data/boardMeetingData";
import { patchFormOptions } from "../../utils/patchFormOptions";

export function TransferHistoryPage() {
  const registry = useGovernanceMembershipRegistry();
  const govReg = useGovernanceRegistry();
  const dynamicFields = patchFormOptions(DESIGNATION_FORM_FIELDS, {
    body_name: govReg.items.map(g => g.body_name),
    governance_body: govReg.items.map(g => g.body_name),
  });

  const rows = registry.items.map(m => ({
    ...m,
    id:              m.id,
    meeting_title:   m.member_designation,
    from_committee:  m.membership_id,
    reason:          m.member_role,
    to_committee:    m.body_name,
    transferred_by:  m.voting_rights === "Yes" ? "Voting" : "Non-Voting",
    transfer_status: m.status,
    transfer_date:   m.start_date,
  }));

  const kpis = buildPageKpis(rows, {
    totalLabel: "Total Designations",
    statusField: "transfer_status",
    statuses: [
      { value: "Active",   label: "Active",          tone: "success" },
      { value: "Inactive", label: "Inactive",        tone: "neutral" },
    ],
  });

  const cfg: PageCfg = {
    title: "Designations & Positions",
    titleKey: "transferHistory.title",
    desc: "Manage designations, positions, and organizational hierarchy levels.",
    descKey: "transferHistory.desc",
    cols: [
      fc("meeting_title",  "Designation",       { headerKey: "headers.meetingTitle" }),
      fc("from_committee", "Membership ID",     { headerKey: "headers.meetingId" }),
      fc("reason",         "Role",              { headerKey: "headers.reason" }),
      fc("to_committee",   "Governance Body",   { headerKey: "headers.totalEntry" }),
      fc("transferred_by", "Voting Rights",     { headerKey: "headers.transferredBy" }),
      BADGE("transfer_status", "Status"),
    ],
    mobileCardMapping: { primary: "meeting_title", meta: ["from_committee", "to_committee"], status: "transfer_status", date: "transfer_date" },
    filters: BASE_FILTERS,
    actions: ROW_VIEW,
    drawerActions: EDIT,
    drawerTitle: "Position Details",
    drawerCols: DESIGNATION_DRAWER_COLS,
    rows,
    kpis,
    entryBtn: "Add Designation",
    formFields: dynamicFields,
    extraBtns: [
      {
        id: "add-position",
        label: "Add Position",
        icon: Briefcase,
        tone: "neutral",
        formTitle: "Add Position",
        formFields: POSITION_FORM_FIELDS,
      },
    ],
    onRowCreate(values) {
      const mId = generateId("MBR", registry.items.map(m => m.membership_id));
      registry.add({
        id: mId, membership_id: mId,
        body_id:              String(values.body_id              ?? mId),
        body_name:            String(values.body_name            ?? values.governance_body ?? ""),
        member_name:          String(values.member_name          ?? ""),
        member_role:          String(values.member_role          ?? "Member"),
        member_designation:   String(values.member_designation   ?? ""),
        voting_rights:        String(values.voting_rights        ?? "Yes"),
        start_date:           String(values.start_date           ?? new Date().toISOString().slice(0, 10)),
        end_date:             String(values.end_date             ?? ""),
        status:               "Active",
        created_at:           new Date().toISOString(),
      } as never);
    },
    onRowUpdate(id, values) {
      registry.update(id, {
        member_designation: values.member_designation != null ? String(values.member_designation) : undefined,
        member_role:        values.member_role        != null ? String(values.member_role)        : undefined,
        body_name:          values.body_name          != null ? String(values.body_name)          : undefined,
        voting_rights:      values.voting_rights      != null ? String(values.voting_rights)      : undefined,
        end_date:           values.end_date           != null ? String(values.end_date)           : undefined,
        status:             values.status             != null ? String(values.status)             : undefined,
      } as never);
    },
  };

  return <GenPage cfg={cfg} />;
}
