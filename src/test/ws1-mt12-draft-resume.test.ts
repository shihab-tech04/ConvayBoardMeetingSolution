import { describe, expect, it, vi } from "vitest";
import { readDraftWizardStep } from "../app/components/forms/draftWizardStep";
import { readMeetingDraftSnapshot, restoreMeetingDraftRow } from "../app/pages/return-register/meetingDraftResume";

const meeting = {id:"draft-record",meeting_id:"MTG-42",approval_status:"Draft",draft_current_step:"3",meeting_title:"Saved meeting",committee:"body-1"};
const parent = {record_id:meeting.id,tenant_id:"tenant-a",revision:7,payload:meeting};
const child = (payload: Record<string,unknown>,tenant_id="tenant-a")=>({record_id:payload.id,tenant_id,revision:1,payload});
const participant = child({id:"p1",meeting_id:"MTG-42",user_id:"user-1",participant_type:"Member",is_required:false,quorum_eligible:true,voting_eligible:true,attendance_requirement:"By Invitation",selection_sources_json:JSON.stringify([{type:"direct",source_id:"user-1",source_label:"Direct"},{type:"group",source_id:"group-1",source_label:"Group"}])});
const agenda = child({id:"a1",meeting_id:"MTG-42",agenda_id:"AGD-1",display_order:1});
const doc = child({id:"d1",meeting_id:"MTG-42",document_id:"DOC-1",version:"2",source:"additional",display_order:1});
const json = (rows: unknown[],count=rows.length)=>new Response(JSON.stringify(rows),{status:200,headers:{"Content-Range":rows.length ? "0-"+(rows.length-1)+"/"+count : "*/"+count}});
function fixture(options:{parents?:unknown[][]; participants?:unknown[]; fail?:string; denied?:boolean}={}) {
  let parentReads=0;
  const request=vi.fn(async(path:string,init?:RequestInit)=>{
    const url=new URL(path,"https://test.invalid");const p=url.searchParams;
    const entity=p.get("entity_key");
    expect(init?.method??"GET").toBe("GET");
    if(entity==="eq."+options.fail) throw new Error("network interrupted");
    if(entity==="eq.bms.meetings"){
      expect(p.get("record_id")).toBe("eq.draft-record");
      const rows=options.parents?.[parentReads++]??[parent];return json(rows);
    }
    expect(p.get("payload->>meeting_id")).toBe("eq.MTG-42");
    expect(p.get("tenant_id")).toBe("eq.tenant-a");
    return json(entity==="eq.bms.meetingParticipantLinks"? options.participants??[participant] : entity==="eq.bms.meetingAgendaLinks"?[agenda]:[doc]);
  });
  return {request,read:()=>readMeetingDraftSnapshot(request,"draft-record","MTG-42",()=>!options.denied)};
}
describe("MT-12 bounded persisted wizard step",()=>{
  it.each([0,1,2,3,4,"0","1","2","3","4"])("restores exact saved index %s",value=>expect(readDraftWizardStep(value,5)).toEqual({index:Number(value),recovered:false}));
  it.each([-1,5,1.25,"-1","5","2.5","Infinity","2x","01",true,[],{}])("recovers invalid index %s to details",value=>expect(readDraftWizardStep(value,5)).toEqual({index:0,recovered:true}));
  it("keeps legacy missing step at details",()=>expect(readDraftWizardStep(undefined,5)).toEqual({index:0,recovered:false}));
});
describe("MT-12 current authorized draft snapshot",()=>{
  it("restores step four with canonical relationships and full source provenance",async()=>{
    const {read,request}=fixture();
    const snapshot=await read();
    const row=restoreMeetingDraftRow(snapshot,[{id:"user-1",name:"Member"}],[{id:"DOC-1",doc_name:"Board paper"}]);
    expect(row.draft_current_step).toBe("3");
    expect(row.committee).toBe("body-1");
    expect(JSON.parse(row.participant_links_json)[0]).toMatchObject({user_id:"user-1",attendance_requirement:"By Invitation",selection_sources:[{type:"direct",source_id:"user-1"},{type:"group",source_id:"group-1"}]});
    expect(JSON.parse(row.selected_agenda_ids_json)).toEqual([{agenda_id:"AGD-1",display_order:1}]);
    expect(JSON.parse(row.additional_doc_ids_json)).toEqual([{doc_id:"DOC-1",version:"2",source_label:"Board paper"}]);
    expect(request).toHaveBeenCalledTimes(5);
  });
  it("denies an absent or unauthorized record without reading relationships",async()=>{
    const absent=fixture({parents:[[]]});await expect(absent.read()).rejects.toThrow();expect(absent.request).toHaveBeenCalledTimes(1);
    const denied=fixture({denied:true});await expect(denied.read()).rejects.toThrow();expect(denied.request).toHaveBeenCalledTimes(1);
  });
  it("denies a stale scheduled draft",async()=>{
    const stale=fixture({parents:[[{...parent,payload:{...meeting,approval_status:"Scheduled"}}]]});await expect(stale.read()).rejects.toThrow();expect(stale.request).toHaveBeenCalledTimes(1);
  });
  it("denies a mismatched meeting or tenant child",async()=>{
    const foreign=fixture({participants:[{...participant,tenant_id:"tenant-b"}]});await expect(foreign.read()).rejects.toThrow(/scope/);
    const wrong=fixture({participants:[{...participant,payload:{...participant.payload,meeting_id:"MTG-other"}}]});await expect(wrong.read()).rejects.toThrow(/scope/);
  });
  it("rejects a concurrent parent revision change",async()=>{
    const f=fixture({parents:[[parent],[{...parent,revision:8}]]});await expect(f.read()).rejects.toThrow(/changed/);
  });
  it("rejects partial relationship failure and supports retry",async()=>{
    const failed=fixture({fail:"bms.meetingAgendaLinks"});await expect(failed.read()).rejects.toThrow("network interrupted");
    await expect(fixture().read()).resolves.toMatchObject({meeting,revision:7});
  });
  it("rejects duplicate readback rather than silently dropping saved records",async()=>{
    const f=fixture({participants:[participant,participant]});await expect(f.read()).rejects.toThrow(/Duplicate/);
  });
});

describe("MT-13 restored canonical links",()=>{
  it("merges duplicate canonical participant provenance during actual draft reconstruction",async()=>{
    const duplicate={...participant,record_id:"p2",payload:{...participant.payload,id:"p2",selection_sources_json:JSON.stringify([{type:"department",source_id:"dept-2",source_label:"Department"}])}};
    const {read}=fixture({participants:[participant,duplicate]});
    const row=restoreMeetingDraftRow(await read(),[{id:"user-1",name:"Member"}],[]);
    const roster=JSON.parse(row.participant_links_json);
    expect(roster).toHaveLength(1);expect(roster[0].selection_sources).toHaveLength(3);
    expect(roster[0].attendance_requirement).toBe("By Invitation");
  });
  it("denies conflicting persisted rights rather than silently discarding a canonical row",async()=>{
    const duplicate={...participant,record_id:"p2",payload:{...participant.payload,id:"p2",voting_eligible:false}};
    const {read}=fixture({participants:[participant,duplicate]});
    const snapshot=await read();
    expect(()=>restoreMeetingDraftRow(snapshot,[],[])).toThrow(/Conflicting/);
  });
});
