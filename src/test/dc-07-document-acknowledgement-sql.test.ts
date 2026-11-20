import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  confirmDocumentAcknowledgement,
  isCurrentVersionAcknowledged,
  type AcknowledgementProof,
} from "../app/components/documents/documentAcknowledgementAck";

const proof: AcknowledgementProof = {
  id:"ACK-001", documentId:"DOC-001", actorName:"Authorised Member", versionId:"2.0",
};
const record = () => ({
  id:proof.id, document_id:proof.documentId,
  acknowledged_by:proof.actorName, version_id:proof.versionId,
});

describe("DC-07 version-bound acknowledgement", () => {
  it("requires explicit SQL true AND refreshed exact record before success", async () => {
    const events:string[]=[];
    await expect(confirmDocumentAcknowledgement(
      async()=>{events.push("write");return true;},
      async()=>{events.push("refresh");},
      ()=>{events.push("read");return record();},proof,
    )).resolves.toBeUndefined();
    expect(events).toEqual(["write","refresh","read"]);
  });
  it("denies false or missing SQL acknowledgement without readback", async () => {
    const refresh=vi.fn();const read=vi.fn();
    await expect(confirmDocumentAcknowledgement(async()=>false,refresh,read,proof)).rejects.toThrow(/not confirmed/);
    await expect(confirmDocumentAcknowledgement(async()=>undefined as unknown as boolean,refresh,read,proof)).rejects.toThrow(/not confirmed/);
    expect(refresh).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });
  it("rejects a record for a different document or actor", async () => {
    await expect(confirmDocumentAcknowledgement(async()=>true,async()=>{},()=>({...record(),document_id:"DOC-FOREIGN"}),proof)).rejects.toThrow(/readback/);
    await expect(confirmDocumentAcknowledgement(async()=>true,async()=>{},()=>({...record(),acknowledged_by:"Another Member"}),proof)).rejects.toThrow(/readback/);
  });
  it("rejects a stale version or missing SQL readback", async () => {
    await expect(confirmDocumentAcknowledgement(async()=>true,async()=>{},()=>({...record(),version_id:"1.0"}),proof)).rejects.toThrow(/readback/);
    await expect(confirmDocumentAcknowledgement(async()=>true,async()=>{},()=>undefined,proof)).rejects.toThrow(/readback/);
  });
  it("does not show old-version acknowledgement as current-version completion", () => {
    expect(isCurrentVersionAcknowledged([{...record(),version_id:"1.0"}],"DOC-001","Authorised Member","2.0")).toBe(false);
    expect(isCurrentVersionAcknowledged([record()],"DOC-001","Authorised Member","2.0")).toBe(true);
  });
  it("rejects other actor or document without leaking completion", () => {
    expect(isCurrentVersionAcknowledged([record()],"DOC-001","Different Member","2.0")).toBe(false);
    expect(isCurrentVersionAcknowledged([record()],"DOC-OTHER","Authorised Member","2.0")).toBe(false);
  });
  it("preserves legacy unversioned acknowledgement for original 1.0 only", () => {
    const legacy={...record(),version_id:undefined};
    expect(isCurrentVersionAcknowledged([legacy],"DOC-001","authorised member","1.0")).toBe(true);
    expect(isCurrentVersionAcknowledged([legacy],"DOC-001","authorised member","2.0")).toBe(false);
  });
  it("keeps network errors visible as failed saves", async () => {
    await expect(confirmDocumentAcknowledgement(async()=>{throw new Error("Network denied");},async()=>{},record,proof)).rejects.toThrow("Network denied");
  });
  it("wires the live drawer to awaited ACK/readback and removes fake audit writes in this tab", () => {
    const src=readFileSync("src/app/components/documents/DocumentDetailsDrawer.tsx","utf8");
    const body=src.split("function AcknowledgementsTab(")[1]?.split("// ── RelatedRecordsTab")[0]??"";
    expect(body).toContain("await confirmDocumentAcknowledgement(");
    expect(body).toContain("ackReg.getById(pending.id)");
    expect(body).toContain("isCurrentVersionAcknowledged(");
    expect(body).toContain("loading={ackSaving}");
    expect(body).not.toContain("auditReg.add(");
  });
});
