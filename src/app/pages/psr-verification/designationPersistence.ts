/** GV-14 isolated designation records; must never create/update membership rows.
 * Server controls for scoped actor, tenant, effective authority and history
 * remain owned by WS0/WS-F and require real SQL/RLS acceptance evidence.
 */
import type { EntityRecord } from "../../hooks/useEntityRegistry";
export interface DesignationRecord extends EntityRecord {
  designation_id: string;
  designation_title: string;
  category: string;
  governance_body: string;
  level: string;
  voting_rights: boolean;
  status: "Active" | "Inactive";
  description: string;
  created_at: string;
}
export interface DesignationGateway {
  list: () => Promise<DesignationRecord[]>;
  create: (row: DesignationRecord) => Promise<boolean>;
  update: (id: string, patch: Partial<DesignationRecord>) => Promise<boolean>;
}
type Values = Record<string, unknown>;
const TEXT_FIELDS = ["designation_title","category","governance_body","level","description"] as const;
const CATEGORY = new Set(["", "Executive", "Non-Executive", "Independent", "External", "Advisory"]);
const LEVEL = new Set(["", "Board Level", "Senior Management", "Management", "Staff"]);
const normal = (value:string) => value.normalize("NFKC").trim().toLowerCase();
function patchFrom(values:Values):Partial<DesignationRecord> {
  const patch:Record<string,string|boolean> = {};
  for(const field of TEXT_FIELDS) {
    const value = values[field];
    if(value===undefined||value===null) continue;
    if(typeof value!=="string"&&typeof value!=="number") throw new Error("Designation fields must be text.");
    patch[field]=String(value).trim();
  }
  if(values.voting_rights!==undefined&&values.voting_rights!==null){
    if(![true,false,"true","false"].includes(values.voting_rights as string|boolean))
      throw new Error("Voting rights must be a true or false value.");
    patch.voting_rights=values.voting_rights===true||values.voting_rights==="true";
  }
  if(values.status!==undefined&&values.status!==null){
    if(values.status!=="Active"&&values.status!=="Inactive")
      throw new Error("Unsupported designation status.");
    patch.status=values.status;
  }
  if(patch.designation_title!==undefined&&!String(patch.designation_title).trim())
    throw new Error("Designation title is required.");
  if(patch.category!==undefined&&!CATEGORY.has(String(patch.category)))
    throw new Error("Unsupported designation category.");
  if(patch.level!==undefined&&!LEVEL.has(String(patch.level)))
    throw new Error("Unsupported designation level.");
  return patch as Partial<DesignationRecord>;
}
function assertReadback(row:DesignationRecord|undefined,expected:Partial<DesignationRecord>) {
  if(!row||Object.entries(expected).some(([key,value])=>row[key]!==value))
    throw new Error("Designation SQL readback is missing or inconsistent. Refresh before retrying.");
}
export async function createDesignation(values:Values,identity:{id:string;created_at:string},gateway:DesignationGateway){
  const patch=patchFrom(values);
  if(!identity.id?.trim()||!identity.created_at?.trim()||!patch.designation_title?.trim())
    throw new Error("A stable designation ID and title are required.");
  const existing=await gateway.list();
  if(existing.some(r=>r.id===identity.id||r.designation_id===identity.id||
      normal(r.designation_title)===normal(patch.designation_title!)))
    throw new Error("Designation ID or title already exists.");
  const record:DesignationRecord={
    id:identity.id,designation_id:identity.id,designation_title:patch.designation_title!,
    category:patch.category??"",governance_body:patch.governance_body??"",
    level:patch.level??"",voting_rights:patch.voting_rights??true,
    status:patch.status??"Active",description:patch.description??"",
    created_at:identity.created_at,
  };
  if((await gateway.create(record))!==true)
    throw new Error("Designation was not confirmed by SQL.");
  assertReadback((await gateway.list()).find(x=>x.id===identity.id),record);
  return record;
}
export async function updateDesignation(id:string,values:Values,gateway:DesignationGateway){
  if(!id.trim()) throw new Error("Designation ID required.");
  const patch=patchFrom(values);
  const rows=await gateway.list();
  const before=rows.find(x=>x.id===id);
  if(!before) throw new Error("Designation not found. Refresh and retry.");
  if(!Object.keys(patch).length) return true;
  if(patch.designation_title&&rows.some(x=>x.id!==id&&
    normal(x.designation_title)===normal(patch.designation_title!)))
      throw new Error("Another designation already has that title.");
  if((await gateway.update(id,patch))!==true)
    throw new Error("Designation update was not confirmed by SQL.");
  assertReadback((await gateway.list()).find(x=>x.id===id),{id,...patch});
  return true;
}
