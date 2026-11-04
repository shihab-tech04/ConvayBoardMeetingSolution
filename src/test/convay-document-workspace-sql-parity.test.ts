import { describe,expect,it } from "vitest";
import { readFileSync } from "node:fs";
const sql=readFileSync("supabase/migrations/20261104230000_convay_document_workspace_registry_parity.sql","utf8");
const frontend=readFileSync("src/app/data/documentWorkspaceData.ts","utf8");
const keys=["bms.doc.threads","bms.doc.access_grants","bms.doc.approvals_v2","bms.doc.pack_links","bms.doc.acknowledgements"];
describe("Document workspace SQL contract and access control",()=>{
  it.each(keys)("registers %s without bypassing document scope",key=>{
    expect(frontend).toContain('"'+key+'"');
    expect(sql).toContain("('"+key+"'");
    expect((sql.split("'"+key+"'").length-1)).toBeGreaterThan(4);
  });
  it("retains the existing four RLS policies with additional scoped predicates",()=>{
    expect((sql.match(/create policy convay_records_/g)||[])).toHaveLength(4);
    expect(sql).toContain("document_scope_authorized(payload->>'document_id'");
    expect(sql).not.toMatch(/disable row level security|grant (all|select).* to anon/i);
  });
  it("binds acknowledgements to signed-in users and prevents editing evidence",()=>{
    expect(sql).toContain("new.payload:=jsonb_set(new.payload,'{acknowledged_user_id}'");
    expect(sql).toContain("Document acknowledgements and approvals are append-only");
    expect(sql).toContain("convay_document_ack_user_unique");
    expect(sql).toContain("current_user='postgres'");
    expect(sql).toContain("current_setting('convay.authorized_document_cleanup',true)='true'");
    expect(sql).toContain("perform set_config('convay.authorized_document_cleanup','true',true)");
    expect(sql).toContain("perform set_config('convay.authorized_document_cleanup','',true)");
  });
  it("recognizes external document IDs and deletes associated workspace rows",()=>{
    expect(sql).toContain("d.payload->>'doc_id'=p_doc");
    expect(sql).toContain("where entity_key='bms.documents' and record_id=v_record_id;");
    expect(sql).toContain("bms.doc.pack_links");
  });
});
