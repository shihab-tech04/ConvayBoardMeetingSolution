import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  validateMeetingTemplateDefinition,
  assertTemplateMutationReadback,
  type MeetingTemplateDefinition,
  type MeetingTemplateVersion,
  type MeetingTemplateMutationReceipt,
} from "../app/services/saas/meetingTemplateControl";

const sql = readFileSync(resolve(process.cwd(),
  "supabase/migrations/20261123210000_convay_meeting_template_versioning.sql"),"utf8");
const id = "11111111-1111-4111-8111-111111111111";
const tenant = "22222222-2222-4222-8222-222222222222";
const request = "33333333-3333-4333-8333-333333333333";

const definition = (): MeetingTemplateDefinition => ({
  steps: [
    { id:"meeting-info",title:"Meeting information", fields:[
      {id:"meeting-title",type:"text",label:"Meeting title",required:true},
      {id:"meeting-date",type:"date",label:"Meeting date",required:true},
    ]},
    {id:"attendance",title:"Meeting participants", fields:[
      {id:"attendees",type:"participants",label:"Participants"},
      {id:"meeting-category",type:"select",label:"Meeting category",options:["Board","Committee"]},
    ]},
  ],
});
const version = ():MeetingTemplateVersion=>({
  id,tenant_id:tenant,template_key:"board_meeting",title:"Board Meeting",
  description:"Company board meeting",source_template_id:null,
  revision:1,state:"draft",definition:definition(),current_revision:1,
  published_revision:null,published_at:null,
});
const receipt = ():MeetingTemplateMutationReceipt=>({
  template_id:id,tenant_id:tenant,revision:1,published_revision:null,
  request_id:request,action:"create",meeting_activation_enabled:false,
});

describe("MT-CONFIG-01 versioned meeting template SQL ↔ application contract",()=>{
  it("accepts company-defined, ordered typed meeting steps with optional approvals metadata",()=>{
    expect(()=>validateMeetingTemplateDefinition(definition())).not.toThrow();
    expect(()=>validateMeetingTemplateDefinition({...definition(),approvals:{enabled:false}})).not.toThrow();
  });
  it("rejects no steps, duplicate step names, unsafe IDs and excess step counts",()=>{
    expect(()=>validateMeetingTemplateDefinition({steps:[]})).toThrow();
    expect(()=>validateMeetingTemplateDefinition({steps:Array(21).fill(definition().steps[0])})).toThrow();
    expect(()=>validateMeetingTemplateDefinition({steps:[definition().steps[0],definition().steps[0]]})).toThrow();
    expect(()=>validateMeetingTemplateDefinition({steps:[{id:"<script>",title:"Unsafe",fields:[]}]})).toThrow();
  });
  it("rejects invalid, repeated, untyped and misconfigured fields",()=>{
    const base = definition().steps[0];
    for(const fields of [
      [base.fields[0],base.fields[0]],
      [{id:"a",type:"file",label:"x"}],
      [{id:"a",type:"script",label:"Run arbitrary code"}],
      [{id:"a",type:"select",label:"Select a category"}],
      [{id:"a",type:"text",label:"Valid label",required:"yes"}],
    ]){
      expect(()=>validateMeetingTemplateDefinition({steps:[{...base,fields:fields as never}]})).toThrow();
    }
  });
  it("does not represent a failed/foreign tenant SQL mutation as completed",()=>{
    expect(()=>assertTemplateMutationReadback(receipt(),version(),
      {action:"create",request_id:request,tenant_id:tenant})).not.toThrow();
    expect(()=>assertTemplateMutationReadback(receipt(),{...version(),tenant_id:id},
      {action:"create",request_id:request,tenant_id:tenant})).toThrow();
    expect(()=>assertTemplateMutationReadback(receipt(),{...version(),revision:2},
      {action:"create",request_id:request,tenant_id:tenant})).toThrow();
    expect(()=>assertTemplateMutationReadback({...receipt(),meeting_activation_enabled:true} as never,version(),
      {action:"create",request_id:request,tenant_id:tenant})).toThrow();
  });
  it("requires an exact published SQL revision before acknowledging publication",()=>{
    const pubReceipt={...receipt(),action:"publish" as const,published_revision:1};
    const pubRead={...version(),state:"published" as const,published_revision:1,published_at:"2026-11-23T00:00:00Z"};
    expect(()=>assertTemplateMutationReadback(pubReceipt,pubRead,
      {action:"publish",request_id:request,tenant_id:tenant})).not.toThrow();
    expect(()=>assertTemplateMutationReadback(pubReceipt,version(),
      {action:"publish",request_id:request,tenant_id:tenant})).toThrow();
  });
  it("keeps tenant configuration private, audited, revision-controlled, and fail closed",()=>{
    for(const t of ["meeting_template_catalog","meeting_template_versions","meeting_template_events","meeting_template_receipts"]) {
      expect(sql).toContain("alter table convay_private."+t+" enable row level security");
      expect(sql).toContain("revoke all on convay_private."+t+" from public,anon,authenticated");
    }
    expect(sql).toContain("account_status='active'");
    expect(sql).toContain("auth.uid()");
    expect(sql).toContain("convay_private.tenant_admin_authorized");
    expect(sql).toContain("prevent_template_version_mutation");
    expect(sql).toContain("prevent_template_event_mutation");
    expect(sql).toContain("Template request ID reused with changed input");
    expect(sql).toContain("Meeting template administration denied");
    expect(sql).toContain("'meeting_activation_enabled',false");
    expect(sql).toContain("grant execute on function public.convay_meeting_template_manage(text,jsonb) to authenticated");
    expect(sql).not.toContain("grant select on convay_private.meeting_template_catalog to authenticated");
    expect(sql).not.toContain("create policy using (true)");
  });
  it("supports explicit published starter copying without automatic company provisioning",()=>{
    expect(sql).toContain("p_action='copy'");
    expect(sql).toContain("v_source.published_revision");
    expect(sql).toContain("s.tenant_id is null");
    expect(sql).toContain("Copying a starter requires a tenant");
    expect(sql).toContain("Only published Convay starters are visible");
  });
});
