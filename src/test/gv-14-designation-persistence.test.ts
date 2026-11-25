import { describe,expect,it,vi } from "vitest";
import {
 createDesignation,updateDesignation,
 type DesignationRecord,type DesignationGateway,
} from "../app/pages/psr-verification/designationPersistence";
const ident={id:"DES-001",created_at:"2026-11-20T00:00:00Z"};
const values={designation_title:"Chief Secretary",category:"Executive",
  governance_body:"Board of Directors",level:"Board Level",
  voting_rights:true,status:"Active",description:"Authorized designation"};
function gateway(init:DesignationRecord[]=[]):DesignationGateway {
 let list=init.map(x=>({...x}));
 return {
   list:vi.fn(async()=>list.map(x=>({...x}))),
   create:vi.fn(async(row)=>{list.push(row);return true;}),
   update:vi.fn(async(id,patch)=>{list=list.map(x=>x.id===id?{...x,...patch}:x);return true;}),
 };
}
describe("GV-14 designation registry isolation and SQL persistence",()=>{
 it("creates a stable designation record only after SQL readback",async()=>{
   const g=gateway();const row=await createDesignation(values,ident,g);
   expect(row.designation_id).toBe(ident.id);
   expect(g.list).toHaveBeenCalledTimes(2);
 });
 it("preserves voting_rights from the original toggle input",async()=>{
   const g=gateway();const row=await createDesignation({...values,voting_rights:false},ident,g);
   expect(row.voting_rights).toBe(false);
 });
 it("rejects missing titles and invalid status before mutation",async()=>{
   const g=gateway();
   await expect(createDesignation({...values,designation_title:""},ident,g)).rejects.toThrow(/title/);
   await expect(createDesignation({...values,status:"Retired"},ident,g)).rejects.toThrow(/status/);
   expect(g.create).not.toHaveBeenCalled();
 });
 it("rejects existing ID and canonical duplicate titles",async()=>{
   const g=gateway();await createDesignation(values,ident,g);
   await expect(createDesignation(values,ident,g)).rejects.toThrow(/exists/);
   await expect(createDesignation({...values,designation_title:" chief SECRETARY "},{...ident,id:"DES-002"},g)).rejects.toThrow(/exists/);
   expect(g.create).toHaveBeenCalledOnce();
 });
 it("fails if SQL denies the new record",async()=>{
   const g=gateway();g.create=vi.fn(async()=>false);
   await expect(createDesignation(values,ident,g)).rejects.toThrow(/not confirmed/);
 });
 it("fails if server ACK has no matching registry readback",async()=>{
   const g=gateway();g.create=vi.fn(async()=>true);
   await expect(createDesignation(values,ident,g)).rejects.toThrow(/readback/);
 });
 it("updates supplied-only fields while retaining stable IDs and voting rights",async()=>{
   const g=gateway();await createDesignation(values,ident,g);
   expect(await updateDesignation("DES-001",{description:"Updated"},g)).toBe(true);
   const row=(await g.list())[0];
   expect(row.designation_id).toBe("DES-001");
   expect(row.voting_rights).toBe(true);
   expect(row.description).toBe("Updated");
 });
 it("rejects missing record or failed update",async()=>{
   const g=gateway();await expect(updateDesignation("not-found",{description:"bad"},g)).rejects.toThrow(/not found/);
   await createDesignation(values,ident,g);
   g.update=vi.fn(async()=>false);
   await expect(updateDesignation("DES-001",{description:"bad"},g)).rejects.toThrow(/not confirmed/);
 });
 it("rejects stale post-update readback",async()=>{
   const g=gateway();await createDesignation(values,ident,g);
   g.update=vi.fn(async()=>true);
   await expect(updateDesignation("DES-001",{description:"stale"},g)).rejects.toThrow(/readback/);
 });
});
