import { describe, expect, it } from "vitest";
import { readDocumentReadiness, materialStatusLabel } from "../app/pages/return-register/documentReadiness";
const doc = {id:"row-1",doc_id:"DOC-1",doc_name:"Financial report",version:"2.0",related_meeting:"",related_agenda:"",original_file_ref:"storage/current"};
const link = {id:"link",meeting_id:"MTG-1",document_id:"DOC-1",version:"2.0",source:"additional" as const,display_order:1};
const read = (overrides: { agendas?: Parameters<typeof readDocumentReadiness>[1]; agendaLinks?: Parameters<typeof readDocumentReadiness>[2]; links?: Parameters<typeof readDocumentReadiness>[3]; agendaDocs?: Parameters<typeof readDocumentReadiness>[4]; docs?: Parameters<typeof readDocumentReadiness>[5]; versions?: Parameters<typeof readDocumentReadiness>[6] } = {}) => readDocumentReadiness("MTG-1", overrides.agendas??[],overrides.agendaLinks??[],overrides.links??[link],overrides.agendaDocs??[],overrides.docs??[doc],overrides.versions??[]);
describe("QR-05 saved meeting and agenda material projection",()=>{
  it("includes additional linked documents by canonical ID without claiming access",()=>{
    const rows=read();expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({documentId:"DOC-1",inSnapshot:true,version:"2.0",status:"reference_present"});
    expect(materialStatusLabel(rows[0].status)).toContain("access unverified");
  });
  it("matches registry row aliases",()=>expect(read({links:[{...link,document_id:"row-1"}]})[0].documentId).toBe("DOC-1"));
  it("retains unavailable saved links",()=>expect(read({docs:[]})[0].status).toBe("unavailable_document"));
  it("does not expose other meeting's links",()=>expect(read({links:[{...link,meeting_id:"MTG-2"}]})).toEqual([]));
  it("does not substitute a current file for a missing historical version",()=>expect(read({links:[{...link,version:"1.0"}]})[0].status).toBe("unavailable_version"));
  it("reads an exact historical version",()=>expect(read({links:[{...link,version:"1.0"}],versions:[{id:"v1",version_id:"V1",document_id:"DOC-1",version_number:"1.0",content_ref:"storage/previous"}]})[0]).toMatchObject({version:"1.0",status:"reference_present"}));
  it("reports a missing content reference",()=>expect(read({docs:[{...doc,original_file_ref:""}]})[0].status).toBe("missing_content"));
  it("includes nested agenda references without treating them as saved meeting links",()=>{
    const rows=read({links:[],agendas:[{id:"a1",agenda_id:"A1"},{id:"a2",agenda_id:"A2",parent_agenda_id:"A1"},{id:"a3",agenda_id:"A3",parent_agenda_id:"a2"}],agendaLinks:[{meeting_id:"MTG-1",agenda_id:"A1"}],agendaDocs:[{id:"al",agenda_id:"a3",document_id:"DOC-1"},{id:"outside",agenda_id:"A9",document_id:"DOC-9"}]});
    expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({inSnapshot:false,documentId:"DOC-1"});
  });
  it("keeps a saved snapshot version instead of a later agenda reference",()=>{
    const rows=read({agendaLinks:[{meeting_id:"MTG-1",agenda_id:"A1"}],agendaDocs:[{id:"al",agenda_id:"A1",document_id:"row-1",document_version_id:"other"}]});expect(rows).toHaveLength(1);expect(rows[0].version).toBe("2.0");
  });
  it("does not guess between ambiguous document records",()=>expect(read({docs:[doc,{...doc,id:"row-2"}]})[0].status).toBe("unavailable_document"));
  it("does not claim a legacy document is saved in the meeting",()=>expect(read({links:[],docs:[{...doc,related_meeting:"MTG-1"}]})[0].inSnapshot).toBe(false));
});
