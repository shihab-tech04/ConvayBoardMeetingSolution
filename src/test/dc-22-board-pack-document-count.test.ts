import { describe, expect, it } from "vitest";
import { activeBoardPackDocumentCount } from "../app/pages/agenda-documents/boardPackActiveDocumentCount";
const pack = {id:"row-3",pack_id:"BP-003",document_count:"8"};
const links = [
  {board_pack_id:"BP-003",document_id:"a",link_status:"active"},
  {board_pack_id:"BP-003",document_id:"b",link_status:"active"},
  {board_pack_id:"BP-003",document_id:"a",link_status:"active"},
  {board_pack_id:"BP-003",document_id:"c",link_status:"superseded"},
];
describe("DC-22 active board-pack document count projection",()=>{
  it("uses active linked documents",()=>expect(activeBoardPackDocumentCount(pack,links)).toBe("2"));
  it("deduplicates repeated version membership",()=>expect(activeBoardPackDocumentCount(pack,links)).toBe("2"));
  it("falls back to persisted count when no links are available",()=>expect(activeBoardPackDocumentCount(pack,[])).toBe("8"));
  it("accepts canonical pack ID",()=>expect(activeBoardPackDocumentCount(pack,[{board_pack_id:"row-3",document_id:"x",link_status:"active"}])).toBe("1"));
  it("excludes links to other packs",()=>expect(activeBoardPackDocumentCount(pack,[{board_pack_id:"other",document_id:"x",link_status:"active"}])).toBe("8"));
  it("returns zero for explicitly removed only links",()=>expect(activeBoardPackDocumentCount(pack,[{board_pack_id:"BP-003",document_id:"x",link_status:"removed"}])).toBe("0"));
  it("does not count empty document IDs",()=>expect(activeBoardPackDocumentCount(pack,[{board_pack_id:"BP-003",document_id:"",link_status:"active"}])).toBe("0"));
  it("does not count ambiguous nonactive statuses",()=>expect(activeBoardPackDocumentCount(pack,[{board_pack_id:"BP-003",document_id:"x",link_status:"unknown"}])).toBe("0"));
});
