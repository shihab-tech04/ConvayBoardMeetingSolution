import { describe, expect, it } from "vitest";
import { normalizeDraftRelationships as normalize } from "../app/pages/return-register/draftRelationshipPayload";
const participant={id:"link-1",user_id:"u1",user_name:"User",user_designation:"Member",org_path:"Board",member_category:"general",participant_type:"Member",is_required:false,voting_eligible:true,quorum_eligible:false,attendance_requirement:"By Invitation",selection_sources:[{type:"individual",source_id:"u1",source_label:"Direct"}]};
const values=(participants:unknown[]=[],agendas:unknown[]=[],documents:unknown[]=[])=>({participant_links_json:JSON.stringify(participants),selected_agenda_ids_json:JSON.stringify(agendas),additional_doc_ids_json:JSON.stringify(documents)});
describe("MT-13 preserved strict relationship regression cases",()=>{
  it("new draft with uninitialized hidden fields",()=>expect(normalize({},true)).toEqual({participants:[],agendas:[],documents:[]}));
  it("missing existing draft selections fail closed",()=>expect(()=>normalize({})).toThrow(/invalid/));
  it("corrupt participant JSON is not empty",()=>expect(()=>normalize({...values(),participant_links_json:"{broken"})).toThrow(/invalid/));
  it("object instead of agenda array rejected",()=>expect(()=>normalize({...values(),selected_agenda_ids_json:"{}"})).toThrow(/invalid/));
  it("duplicate participant combines exact provenance",()=>{const p=normalize(values([participant,{...participant,id:"link-2",selection_sources:[{type:"group",source_id:"g1",source_label:"Group"}]}])).participants;expect(p).toHaveLength(1);expect(p[0].selection_sources).toHaveLength(2);expect(p[0].attendance_requirement).toBe("By Invitation")});
  it("duplicate source is not duplicated",()=>expect(normalize(values([participant,participant])).participants[0].selection_sources).toHaveLength(1));
  it("conflicting voting eligibility fails closed",()=>expect(()=>normalize(values([participant,{...participant,voting_eligible:false}]))).toThrow(/Conflicting/));
  it("contradictory attendance denied",()=>expect(()=>normalize(values([{...participant,is_required:true}]))).toThrow(/attendance/));
  it("valid legacy attendance compatibility",()=>expect(normalize(values([{...participant,attendance_requirement:undefined}])).participants[0].attendance_requirement).toBe("Optional"));
  it("agenda ordering retained and duplicate IDs deduplicated",()=>expect(normalize(values([],[{agenda_id:"a2",display_order:2},{agenda_id:"a1",display_order:1},{agenda_id:"a1",display_order:1}])).agendas).toEqual([{agenda_id:"a1",display_order:1},{agenda_id:"a2",display_order:2}]));
  it("ambiguous agenda position denied",()=>expect(()=>normalize(values([],[{agenda_id:"a1",display_order:1},{agenda_id:"a2",display_order:1}]))).toThrow(/ordering/));
  it("additional document ID and version preserved",()=>expect(normalize(values([],[],[{doc_id:"d1",version:"2.0",source_label:"Doc"}])).documents).toEqual([{doc_id:"d1",version:"2.0",source_label:"Doc"}]));
  it("conflicting document versions denied",()=>expect(()=>normalize(values([],[],[{doc_id:"d1",version:"2.0",source_label:"Doc"},{doc_id:"d1",version:"3.0",source_label:"Doc"}]))).toThrow(/version/));
});
