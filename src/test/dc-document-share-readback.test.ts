import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { DocumentAccessEntry } from "../app/services/types/documents";
import {
  resolveUniqueActiveDocumentUserId,
  documentShareGrantReadback,
  documentShareRevokeReadback,
} from "../app/components/documents/documentAccessReadback";

const USER_ID="612b38cd-a24b-49c2-a4d7-a017e8614397";
const OTHER_ID="af6b4ec0-efed-4cdb-ab67-57cab686b3d0";
const grant:DocumentAccessEntry={
  id:"access-123",document_id:"DOC-001",subject_type:"user",
  subject_id:USER_ID,permission:"view",granted_by:"actor-01",
  granted_at:"2026-11-20T00:00:00.000Z",
};
describe("DC document sharing — identity and readback", () => {
  it("uses a unique active authenticated UUID, never a display name", () => {
    const result=resolveUniqueActiveDocumentUserId([{id:USER_ID,name:"Alice",status:"Active"}],"Alice");
    expect(result).toBe(USER_ID);
    expect(result).not.toBe("Alice");
  });
  it("rejects duplicate display names rather than sharing with an arbitrary person", () => {
    expect(() => resolveUniqueActiveDocumentUserId([
      {id:USER_ID,name:"Alice",status:"Active"},
      {id:OTHER_ID,name:"Alice",status:"Active"},
    ],"Alice")).toThrow(/unique active user/i);
  });
  it("rejects inactive, missing, or legacy non-auth identifiers", () => {
    expect(()=>resolveUniqueActiveDocumentUserId([{id:USER_ID,name:"Alice",status:"Inactive"}],"Alice")).toThrow();
    expect(()=>resolveUniqueActiveDocumentUserId([{id:"EMP-001",name:"Alice",status:"Active"}],"Alice")).toThrow(/verified authentication ID/);
    expect(()=>resolveUniqueActiveDocumentUserId([],"Alice")).toThrow();
  });
  it("only confirms grants after exact server readback", () => {
    expect(documentShareGrantReadback([grant],grant,"DOC-001",USER_ID,"view")).toBe(true);
    expect(documentShareGrantReadback([],grant,"DOC-001",USER_ID,"view")).toBe(false);
    expect(documentShareGrantReadback([grant],grant,"DOC-002",USER_ID,"view")).toBe(false);
    expect(documentShareGrantReadback([grant],grant,"DOC-001",OTHER_ID,"view")).toBe(false);
    expect(documentShareGrantReadback([grant],grant,"DOC-001",USER_ID,"admin")).toBe(false);
  });
  it("rejects a wrong-user readback even when an ACK ID matches", () => {
    expect(documentShareGrantReadback([{...grant,subject_id:OTHER_ID}],grant,"DOC-001",USER_ID,"view")).toBe(false);
  });
  it("confirms revocation only when entry disappears from refreshed access list", () => {
    expect(documentShareRevokeReadback([],grant.id)).toBe(true);
    expect(documentShareRevokeReadback([grant],grant.id)).toBe(false);
    expect(documentShareRevokeReadback([], "")).toBe(false);
  });
  it("wires the real access drawer and never hides a list read failure as empty", () => {
    const src=readFileSync("src/app/components/documents/DocumentDetailsDrawer.tsx","utf8");
    expect(src).toContain("resolveUniqueActiveDocumentUserId(users, selUser)");
    expect(src).toContain("documentShareGrantReadback(");
    expect(src).toContain("documentShareRevokeReadback(");
    expect(src).toContain("accessError");
    expect(src).toContain("Unable to load document access.");
    expect(src).toContain("Retry");
  });
});
