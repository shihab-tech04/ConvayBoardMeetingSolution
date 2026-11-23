import { useRef } from "react";
import { Briefcase } from "lucide-react";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../data/modulePageConfigs";
import { DESIGNATION_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { buildPageKpis } from "../../utils/buildPageKpis";
import { DESIGNATION_FORM_FIELDS, POSITION_FORM_FIELDS } from "../boardMeetingFormFields";
import { useGovernanceRegistry, generateId } from "../../data/boardMeetingData";
import { patchFormOptions } from "../../utils/patchFormOptions";
import { createEntityRegistry } from "../../hooks/useEntityRegistry";
import { convayAuth } from "../../services/supabase/convayAuth";
import { createDesignation, updateDesignation,
  type DesignationGateway, type DesignationRecord } from "./designationPersistence";

// GV-14: designations have their own allowlisted SQL registry; governance
// membership rows (bms.memberships) must never be overwritten by this page.
const useDesignationRegistry = createEntityRegistry<DesignationRecord>(
  "bms.designations", "bms:designations-updated", [],
);

export function TransferHistoryPage() {
  const registry = useDesignationRegistry();
  const govReg = useGovernanceRegistry();
  const pendingCreate = useRef<{signature:string;id:string;created_at:string}|null>(null);
  const gateway:DesignationGateway = {
    list:async()=> (await convayAuth.registry<DesignationRecord>("bms.designations","list")).records.map(r=>r.payload),
    create:async row => (await registry.add(row)) === true,
    update:async (id,patch)=>(await registry.update(id,patch)) === true,
  };
  const dynamicFields = patchFormOptions(DESIGNATION_FORM_FIELDS, {
    governance_body: govReg.items.map(g => g.body_name),
  });
  // Retain the approved shared table and drawer visual language. The drawer
  // adapter maps persisted designation attributes onto existing detail keys.
  const rows = registry.items.map(d => ({
    ...d,
    id:d.id,
    designation_type:d.category,
    committee:d.governance_body,
    authority:d.voting_rights ? "Voting" : "Non-Voting",
    mandate:d.description,
    voting_label:d.voting_rights ? "Yes" : "No",
  }));
  const kpis = buildPageKpis(rows, {
    totalLabel:"Total Designations",statusField:"status", statuses:[
      {value:"Active",label:"Active",tone:"success"},
      {value:"Inactive",label:"Inactive",tone:"neutral"},
    ],
  });
  const cfg:PageCfg = {
    title:"Designations & Positions",
    titleKey:"transferHistory.title",
    desc:"Manage designations, positions, and organizational hierarchy levels.",
    descKey:"transferHistory.desc",
    cols:[
      fc("designation_title","Designation",{headerKey:"headers.meetingTitle"}),
      fc("designation_id","Designation ID",{headerKey:"headers.meetingId"}),
      fc("category","Category",{headerKey:"headers.reason"}),
      fc("governance_body","Governance Body",{headerKey:"headers.totalEntry"}),
      fc("voting_label","Voting Rights",{headerKey:"headers.transferredBy"}),
      BADGE("status","Status"),
    ],
    mobileCardMapping:{
      primary:"designation_title",identifier:"designation_id",
      meta:["category","governance_body"],status:"status",
    },
    filters:BASE_FILTERS,
    actions:ROW_VIEW,
    drawerActions:EDIT,
    drawerTitle:"Position Details",
    drawerCols:DESIGNATION_DRAWER_COLS,
    rows,kpis,
    entryBtn:"Add Designation",
    formFields:dynamicFields,
    extraBtns:[{
      id:"add-position",label:"Add Position",icon:Briefcase,tone:"neutral",
      formTitle:"Add Position",formFields:POSITION_FORM_FIELDS,
    }],
    awaitCreateSave:true,
    async onRowCreate(values){
      const signature=JSON.stringify(values);
      if(!pendingCreate.current || pendingCreate.current.signature!==signature){
        pendingCreate.current={
          signature,
          id:generateId("DES",registry.items.map(d=>d.designation_id)),
          created_at:new Date().toISOString(),
        };
      }
      await createDesignation(values,pendingCreate.current,gateway);
      pendingCreate.current=null;
      return true;
    },
    async onRowUpdate(id,values){
      return updateDesignation(id,values,gateway);
    },
  };
  return <GenPage cfg={cfg} />;
}
