import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/buttons/Button";
import { AppTextField } from "../../components/forms/AppTextField";
import { AppSelectField } from "../../components/forms/AppSelectField";
import {
  listManagedTemplates, readManagedTemplate,
  type MeetingTemplateDirectoryEntry, type MeetingTemplateField,
  type MeetingTemplateVersion,
} from "../../services/saas/meetingTemplateControl";
import {
  listStagedCompanyDrafts, readStagedCompanyDraft, saveStagedCompanyDraft,
  type StagedCompanyDraft, type StagedCompanyDraftSummary,
} from "../../services/saas/companyMeetingDrafts";

const panel:React.CSSProperties={
  padding:16,border:"1px solid var(--border-color,#dce1e8)",
  borderRadius:12,background:"var(--card-bg,var(--surface,white))",
};
const note:React.CSSProperties={fontSize:13,lineHeight:1.5,color:"var(--text-secondary,#64748b)"};
const input:React.CSSProperties={
  width:"100%",padding:"10px 12px",borderRadius:10,
  border:"1px solid var(--border-color,#cbd5e1)",
  background:"var(--card-bg,var(--surface,white))",color:"var(--foreground,#111827)",
};
const supportedFields=new Set([
  "text","textarea","date","datetime","number","select","multiselect",
  "checkbox","resolution","meeting_room","duration","quorum",
]);

function missingRequired(field:MeetingTemplateField,value:unknown):boolean {
  return field.required===true
    && (value===undefined||value===null||value===""
      ||(Array.isArray(value)&&value.length===0));
}
function firstError(template:MeetingTemplateVersion,values:Record<string,unknown>):string|null {
  for (const step of template.definition.steps) {
    for (const field of step.fields) {
      if (!supportedFields.has(field.type)) return field.label+" requires linked SQL integration before meeting drafts can be saved.";
      if (missingRequired(field,values[field.id])) return field.label+" is required.";
    }
  }
  return null;
}
export function CompanyMeetingDraftWizard({tenantId}:{tenantId:string}){
  const [options,setOptions]=useState<MeetingTemplateDirectoryEntry[]>([]);
  const [directory,setDirectory]=useState<StagedCompanyDraftSummary[]>([]);
  const [selectedId,setSelectedId]=useState("");
  const [template,setTemplate]=useState<MeetingTemplateVersion|null>(null);
  const [step,setStep]=useState(0);
  const [title,setTitle]=useState("");
  const [values,setValues]=useState<Record<string,unknown>>({});
  const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [lastSaved,setLastSaved]=useState<StagedCompanyDraft|null>(null);
  const [inspected,setInspected]=useState<StagedCompanyDraft|null>(null);

  useEffect(()=>{
    let active=true;
    setError("");setLoading(true);setSelectedId("");setTemplate(null);
    setDirectory([]);setOptions([]);setInspected(null);setLastSaved(null);
    void Promise.all([listManagedTemplates(tenantId),listStagedCompanyDrafts(tenantId)])
      .then(([all,drafts])=>{if(!active)return;
        setOptions(all.filter(t=>t.tenant_id===tenantId&&t.published_revision!==null));
        setDirectory(drafts);
      }).catch(e=>{if(active)setError(e instanceof Error?e.message:"Unable to load company meeting drafts");})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[tenantId]);

  useEffect(()=>{
    let active=true;
    setTemplate(null);setStep(0);setTitle("");setValues({});
    setInspected(null);setRequestId(crypto.randomUUID());
    if(!selectedId)return ()=>{active=false;};
    const chosen=options.find(item=>item.id===selectedId&&item.published_revision!==null);
    if(!chosen)return ()=>{active=false;};
    setLoading(true);setError("");
    void readManagedTemplate(chosen.id,chosen.published_revision!)
      .then(item=>{if(!active)return;
        if(item.id!==chosen.id||item.tenant_id!==tenantId||item.state!=="published"
           ||item.revision!==chosen.published_revision) {
          throw new Error("Published company meeting template SQL scope changed");
        }
        setTemplate(item);
      })
      .catch(e=>{if(active)setError(e instanceof Error?e.message:"Unable to read published template");})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[selectedId,tenantId,options]);

  const change=(key:string,value:unknown)=>{
    setValues(previous=>({...previous,[key]:value}));
    setRequestId(crypto.randomUUID());setError("");setLastSaved(null);
  };
  const current=template?.definition.steps[step];
  const next=()=>{
    if(!template||!current)return;
    for(const field of current.fields){
      if(!supportedFields.has(field.type)) {
        setError(field.label+" requires linked SQL integration before it can be saved.");
        return;
      }
      if(missingRequired(field,values[field.id])){setError(field.label+" is required.");return;}
    }
    setError("");setStep(Math.min(step+1,template.definition.steps.length-1));
  };
  const save=async()=>{
    if(!template||busy||loading)return;
    const failure=firstError(template,values);
    if(failure){setError(failure);return;}
    if(title.trim().length<3||title.trim().length>160){
      setError("Enter a draft title between 3 and 160 characters.");return;
    }
    setBusy(true);setError("");
    try{
      const saved=await saveStagedCompanyDraft(tenantId,template,title,values,requestId);
      setLastSaved(saved.draft);
      setDirectory(await listStagedCompanyDrafts(tenantId));
      toast.success("Company template draft verified in SQL. No meeting was scheduled.");
    }catch(e){
      setError(e instanceof Error?e.message:"Unable to save company meeting draft");
    }finally{setBusy(false);}
  };
  const inspect=async(draftId:string)=>{
    setBusy(true);setError("");
    try{setInspected(await readStagedCompanyDraft(tenantId,draftId));}
    catch(e){setError(e instanceof Error?e.message:"Unable to load company draft");}
    finally{setBusy(false);}
  };
  const renderField=(field:MeetingTemplateField)=>{
    const id="company-draft-"+field.id;
    const value=values[field.id];
    if(!supportedFields.has(field.type))return <p role="alert" style={note}>
      {field.label} ({field.type}) requires certified participant, agenda, or document integration.
      This field is not silently replaced with text.
    </p>;
    if(field.type==="select")return <AppSelectField id={id}
      label={field.label+(field.required?" *":"")} value={String(value??"")}
      disabled={busy} onChange={v=>change(field.id,v)}
      options={[{value:"",label:"Select..."},...(field.options??[]).map(v=>({value:v,label:v}))]}/>;
    if(field.type==="checkbox")return <label htmlFor={id} style={{display:"flex",alignItems:"center",gap:10,fontSize:14}}>
      <input id={id} type="checkbox" checked={value===true} disabled={busy}
        onChange={e=>change(field.id,e.target.checked)}/>{field.label}{field.required?" *":""}
    </label>;
    if(field.type==="multiselect")return <label htmlFor={id} style={{display:"grid",gap:7,fontSize:13}}>
      {field.label}{field.required?" *":""}
      <select id={id} multiple value={Array.isArray(value)?value.map(String):[]}
        disabled={busy} style={{...input,minHeight:95}}
        onChange={e=>change(field.id,Array.from(e.target.selectedOptions,x=>x.value))}>
        {(field.options??[]).map(v=><option key={v} value={v}>{v}</option>)}
      </select>
      <span style={note}>Hold Ctrl or Command to select more than one option.</span>
    </label>;
    if(field.type==="textarea"||field.type==="resolution")return <label htmlFor={id}
      style={{display:"grid",gap:7,fontSize:13}}>
      {field.label}{field.required?" *":""}
      <textarea id={id} rows={3} maxLength={5000} disabled={busy} value={String(value??"")}
        onChange={e=>change(field.id,e.target.value)} style={{...input,resize:"vertical"}}/>
    </label>;
    if(field.type==="text"||field.type==="meeting_room")return <AppTextField
      id={id} label={field.label} required={field.required} disabled={busy}
      value={String(value??"")} onChange={v=>change(field.id,v)}/>;
    return <label htmlFor={id} style={{display:"grid",gap:7,fontSize:13}}>
      {field.label}{field.required?" *":""}
      <input id={id} style={input} disabled={busy}
        type={field.type==="date"?"date":field.type==="datetime"?"datetime-local":"number"}
        value={typeof value==="number"?value:String(value??"")}
        onChange={e=>change(field.id,["number","duration","quorum"].includes(field.type)
          ?(e.target.value===""?undefined:Number(e.target.value)):e.target.value)}/>
    </label>;
  };

  return <section aria-label="Company meeting draft configuration" style={panel}>
    <h3 style={{fontSize:17,fontWeight:650}}>Create a company meeting draft</h3>
    <p style={{...note,margin:"8px 0 14px"}}>
      Choose a published company template, enter its configured fields, and save a SQL-staged draft.
      This is not a scheduled meeting, paid workspace or LiveKit room. Existing meeting UI remains unchanged.
    </p>
    {error&&<p role="alert" style={{color:"#b91c1c",fontSize:13,marginBottom:12}}>{error}</p>}
    {loading&&<p role="status" style={note}>Verifying published company templates and staged drafts…</p>}
    {options.length===0&&!loading&&<p role="status" style={note}>
      No published meeting type is available for this company. Publish one under Manage meeting templates first.
    </p>}
    <div style={{maxWidth:520,marginBottom:12}}>
      <AppSelectField id="company-meeting-template" label="Published meeting type"
        value={selectedId} disabled={busy||loading} onChange={setSelectedId}
        options={[{value:"",label:"Choose a published meeting type"},
          ...options.map(t=>({value:t.id,label:t.title+" · published v"+t.published_revision}))]}/>
    </div>
    {template&&<div style={{display:"grid",gap:14}}>
      <AppTextField id="company-draft-title" label="Draft meeting title" required
        value={title} disabled={busy} onChange={v=>{setTitle(v);setRequestId(crypto.randomUUID());setError("");setLastSaved(null);}}/>
      <nav aria-label="Configured company meeting steps" style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {template.definition.steps.map((item,index)=><Button key={item.id} size="sm"
          variant={step===index?"primary":"secondary"} disabled={busy}
          aria-current={step===index?"step":undefined}
          onClick={()=>{setStep(index);setError("");}}>{index+1}. {item.title}</Button>)}
      </nav>
      <section aria-label="Current configured meeting draft step" style={{...panel,padding:14}}>
        <h4 style={{fontSize:15,fontWeight:650,marginBottom:12}}>
          Step {step+1} of {template.definition.steps.length}: {current?.title}
        </h4>
        {current?.fields.length===0?<p style={note}>No fields configured for this step.</p>:
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:14}}>
            {current?.fields.map(field=><div key={field.id}>{renderField(field)}</div>)}
          </div>}
      </section>
      <div style={{display:"flex",gap:10,justifyContent:"space-between",flexWrap:"wrap"}}>
        <Button variant="secondary" disabled={busy||step===0}
          onClick={()=>{setStep(s=>Math.max(0,s-1));setError("");}}>Previous step</Button>
        {step<template.definition.steps.length-1
          ?<Button disabled={busy} onClick={next}>Next step</Button>
          :<Button loading={busy} disabled={loading||busy} onClick={()=>void save()}>
            Save staged draft in SQL
          </Button>}
      </div>
    </div>}
    {lastSaved&&<p role="status" style={{...note,marginTop:14}}>
      Saved and verified: <strong>{lastSaved.title}</strong>, staged draft {lastSaved.draft_id}.
      No meeting, invitation or room has been created.
    </p>}
    <div style={{borderTop:"1px solid var(--border-color,#dce1e8)",paddingTop:14,marginTop:20}}>
      <h4 style={{fontWeight:650,fontSize:15}}>SQL-staged drafts ({directory.length})</h4>
      {directory.length===0&&<p style={{...note,marginTop:9}}>No staged company meeting drafts.</p>}
      {directory.map(row=><div key={row.draft_id}
        style={{padding:"10px 0",borderBottom:"1px solid var(--border-color,#dce1e8)",
          display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
        <div><strong style={{fontSize:13}}>{row.title}</strong>
          <p style={note}>Published template v{row.template_revision} · {row.status}</p></div>
        <Button variant="secondary" size="sm" disabled={busy}
          onClick={()=>void inspect(row.draft_id)}>View SQL snapshot</Button>
      </div>)}
      {inspected&&<section aria-label="Verified company meeting draft snapshot"
        style={{...panel,marginTop:12}}>
        <h5 style={{fontSize:14,fontWeight:650}}>{inspected.title}</h5>
        <p style={note}>Template {inspected.template_id} · revision {inspected.template_revision}</p>
        <p style={note}>Stored fields: {Object.keys(inspected.values).length} · Staged only</p>
        <Button size="sm" variant="secondary" onClick={()=>setInspected(null)}>Close snapshot</Button>
      </section>}
    </div>
  </section>;
}
