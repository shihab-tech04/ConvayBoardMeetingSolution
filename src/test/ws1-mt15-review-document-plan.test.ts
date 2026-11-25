import { describe, expect, it } from "vitest";
import { buildMeetingDocumentPlan as plan } from "../app/pages/return-register/meetingDocumentPlan";
const agendas=[{id:"r1",agenda_id:"a1",agenda_title:"Parent"},{id:"r2",agenda_id:"a2",agenda_title:"Child",parent_agenda_id:"r1"},{id:"r3",agenda_id:"a3",agenda_title:"Grandchild",parent_agenda_id:"a2"}];
const docs=[{id:"doc-row",doc_id:"doc-1",doc_name:"Board paper",related_agenda:"a3",version:"3.0",confidentiality:"Strictly Confidential",current_version_id:"v3"}];
const versions=[{id:"version-row2",version_id:"v2",document_id:"doc-1",version_number:"2.0"},{id:"version-row3",version_id:"v3",document_id:"doc-1",version_number:"3.0"}];
const selected=[{agenda_id:"a1",display_order:1}];
const linked=[{id:"link-1",agenda_id:"a3",document_id:"doc-row",document_version_id:"v2"}];
describe("MT-15 shared review and schedule document plan",()=>{
  it("includes nested agenda documents, preserves pinned version and canonical IDs",()=>{
    const p=plan(selected,[],agendas,linked,docs,versions);
    expect(p.agendas.map(a=>a.id)).toEqual(["a1","a2","a3"]);
    expect(p.errors).toEqual([]);expect(p.documents).toMatchObject([{document_id:"doc-1",version:"2.0",document_version_id:"v2",source_agenda_id:"a3",display_order:1}]);
  });
  it("does not duplicate a matching additional document",()=>{
    const p=plan(selected,[{doc_id:"doc-1",version:"2.0",source_label:"Board paper"}],agendas,linked,docs,versions);
    expect(p.documents).toHaveLength(1);expect(p.errors).toEqual([]);
  });
  it("does not silently replace conflicting pinned and selected versions",()=>expect(plan(selected,[{doc_id:"doc-1",version:"3.0",source_label:"Board paper"}],agendas,linked,docs,versions).errors[0]).toMatch(/Conflicting/));
  it("rejects missing pinned versions and never invents version 1.0",()=>expect(plan(selected,[],agendas,linked,docs,[]).errors[0]).toMatch(/Pinned/));
  it("preserves explicit historical additional version",()=>expect(plan([],[{doc_id:"doc-1",version:"2.0",source_label:"Board paper"}],agendas,[],docs,versions).documents[0]).toMatchObject({version:"2.0",document_version_id:"v2",source:"additional"}));
  it("rejects inaccessible documents",()=>expect(plan(selected,[],agendas,linked,[],versions).errors[0]).toMatch(/unavailable/));
  it("keeps an empty agenda and document selection optional",()=>expect(plan([],[],agendas,[],docs,versions)).toEqual({agendas:[],documents:[],errors:[],accessConflicts:0}));
  it("preserves the role-based restriction check for the identical schedule plan",()=>expect(plan(selected,[],agendas,linked,docs,versions,[{participant_type:"Observer"}]).accessConflicts).toBe(1));
});
