import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/buttons/Button";
import { AppTextField } from "../../components/forms/AppTextField";
import { AppSelectField } from "../../components/forms/AppSelectField";
import { SConfirmModal } from "../../components/modals/SConfirmModal";
import { listCompanies, type CompanyDirectory } from "../../services/saas/companyDirectory";
import {
  listManagedTemplates,readManagedTemplate,saveTemplateVersion,
  validateMeetingTemplateDefinition,
  type MeetingTemplateDefinition,type MeetingTemplateField,
  type MeetingTemplateDirectoryEntry,type MeetingTemplateVersion,
  type MeetingFieldType,
} from "../../services/saas/meetingTemplateControl";

const panel: React.CSSProperties={
  padding:16,border:"1px solid var(--border-color,#dce1e8)",
  borderRadius:14,background:"var(--card-bg,var(--surface,white))",
};
const note: React.CSSProperties={color:"var(--text-secondary,#64748b)",fontSize:13,lineHeight:1.5};
const fieldTypes:MeetingFieldType[]=[
  "text","textarea","date","datetime","number","select","multiselect","checkbox",
  "file","participants","agenda","resolution","quorum","meeting_room","duration",
];
type Draft = {
  key:string;title:string;description:string;
  definition:MeetingTemplateDefinition;
};
const freshDraft=():Draft=>({
  key:"",title:"",description:"",
  definition:{steps:[{
    id:"step_"+crypto.randomUUID().slice(0,8),title:"Meeting information",
    fields:[{id:"field_"+crypto.randomUUID().slice(0,8),label:"Meeting title",type:"text",required:true}],
  }]},
});
export function MeetingTemplateMarketplace() {
  const [scope,setScope]=useState("global");
  const tenantId=scope==="global"?null:scope;
  const [companies,setCompanies]=useState<CompanyDirectory|null>(null);
  const [templates,setTemplates]=useState<MeetingTemplateDirectoryEntry[]>([]);
  const [starters,setStarters]=useState<MeetingTemplateDirectoryEntry[]>([]);
  const [draft,setDraft]=useState<Draft>(freshDraft);
  const [selected,setSelected]=useState<MeetingTemplateVersion|null>(null);
  const [sourceId,setSourceId]=useState("");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
  const [confirmPublish,setConfirmPublish]=useState<{template:MeetingTemplateVersion;requestId:string}|null>(null);

  const updateDraft=(update:(previous:Draft)=>Draft)=>{
    setDraft(update);setRequestId(crypto.randomUUID());setError("");
  };
  const updateSteps=(steps:MeetingTemplateDefinition["steps"])=>
    updateDraft(previous=>({...previous,definition:{...previous.definition,steps}}));
  const updateStep=(index:number,change:Partial<MeetingTemplateDefinition["steps"][number]>)=>
    updateSteps(draft.definition.steps.map((s,i)=>i===index?{...s,...change}:s));
  const updateField=(stepIndex:number,fieldIndex:number,change:Partial<MeetingTemplateField>)=>
    updateSteps(draft.definition.steps.map((step,i)=>i===stepIndex
      ? {...step,fields:step.fields.map((field,j)=>j===fieldIndex?{...field,...change}:field)}
      : step));
  const addStep=()=>{
    if(draft.definition.steps.length>=20) return;
    updateSteps([...draft.definition.steps,{
      id:"step_"+crypto.randomUUID().slice(0,8),title:"New step",fields:[],
    }]);
  };
  const addField=(index:number)=>{
    const step=draft.definition.steps[index];
    if(!step||step.fields.length>=30) return;
    updateStep(index,{fields:[...step.fields,{
      id:"field_"+crypto.randomUUID().slice(0,8),label:"New field",type:"text",required:false,
    }]});
  };
  const reload=async()=>{
    const [own,global,allCompanies]=await Promise.all([
      listManagedTemplates(tenantId),listManagedTemplates(null),listCompanies(),
    ]);
    setTemplates(own);
    setStarters(global.filter(t=>t.published_revision!==null));
    setCompanies(allCompanies);
  };
  useEffect(()=>{
    let active=true;
    setError("");setLoading(true);setSelected(null);setSourceId("");setDraft(freshDraft());
    void Promise.all([listManagedTemplates(tenantId),listManagedTemplates(null),listCompanies()])
      .then(([own,global,allCompanies])=>{
        if(!active)return;
        setTemplates(own);
        setStarters(global.filter(t=>t.published_revision!==null));
        setCompanies(allCompanies);
      })
      .catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"Unable to verify SQL meeting templates");})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[scope]);

  const edit=async(item:MeetingTemplateDirectoryEntry)=>{
    if(busy)return;
    setBusy(true);setError("");
    try{
      const detail=await readManagedTemplate(item.id,item.revision);
      if(detail.tenant_id!==tenantId) throw new Error("Template tenant scope changed");
      setSelected(detail);setSourceId("");
      setDraft({key:detail.template_key,title:detail.title,description:detail.description,
        definition:detail.definition});
      setRequestId(crypto.randomUUID());
    }catch(reason){setError(reason instanceof Error?reason.message:"Unable to load template revision");}
    finally{setBusy(false);}
  };
  const save=async(action:"create"|"revise"|"copy")=>{
    if(busy)return;
    setBusy(true);setError("");
    try{
      if(draft.title.trim().length<3||draft.title.trim().length>160)
        throw new Error("Template title must be 3–160 characters");
      if(!/^[a-z][a-z0-9_-]{2,63}$/.test(draft.key))
        throw new Error("Template key must be 3–64 lowercase letters, digits, dashes or underscores");
      if(action!=="copy")validateMeetingTemplateDefinition(draft.definition);
      if(action==="copy" && (!tenantId||!sourceId||!starters.some(t=>t.id===sourceId)))
        throw new Error("Select a published Convay starter and a company");
      if(action==="revise"&&(!selected||selected.tenant_id!==tenantId))
        throw new Error("Select a template in this company before editing");
      const data=action==="copy"
        ? {request_id:requestId,tenant_id:tenantId,source_template_id:sourceId,
           template_key:draft.key,title:draft.title.trim(),description:draft.description}
        : action==="revise"
          ? {request_id:requestId,tenant_id:tenantId,template_id:selected!.id,
             expected_revision:selected!.current_revision,title:draft.title.trim(),
             description:draft.description,definition:draft.definition}
          : {request_id:requestId,tenant_id:tenantId,template_key:draft.key,
             title:draft.title.trim(),description:draft.description,definition:draft.definition};
      const after=await saveTemplateVersion(action,data);
      if(after.tenant_id!==tenantId)throw new Error("SQL template save scope mismatch");
      setSelected(after);setSourceId("");
      setDraft({key:after.template_key,title:after.title,description:after.description,
        definition:after.definition});
      setRequestId(crypto.randomUUID());
      await reload();
      toast.success(action==="copy"?"Starter copied into company SQL":"Meeting template draft verified in SQL");
    }catch(reason){setError(reason instanceof Error?reason.message:"Unable to save meeting template");}
    finally{setBusy(false);}
  };
  const publish=async()=>{
    if(!confirmPublish||busy)return;
    setBusy(true);setError("");
    try{
      const candidate=confirmPublish.template;
      if(candidate.tenant_id!==tenantId || candidate.state!=="draft")
        throw new Error("Only the latest company draft can be published");
      const after=await saveTemplateVersion("publish",{
        request_id:confirmPublish.requestId,tenant_id:tenantId,
        template_id:candidate.id,expected_revision:candidate.current_revision,
      });
      setSelected(after);
      await reload();
      setConfirmPublish(null);
      toast.success("Published template revision verified in SQL");
    }catch(reason){setError(reason instanceof Error?reason.message:"Template publishing failed");}
    finally{setBusy(false);}
  };

  return <section aria-label="Dynamic meeting templates and marketplace">
    <h2 style={{fontWeight:650,fontSize:19,marginBottom:12}}>Meeting types & template marketplace</h2>
    <p style={note}>Create or revise meeting types with any number of configured steps and fields, publish immutable versions, and copy published Convay starters to a company. These are administrative configurations only; meeting activation awaits tenant isolation and runtime wizard certification.</p>
    {error&&<p role="alert" style={{...note,color:"#b91c1c",marginTop:12}}>{error}</p>}
    {loading&&<p role="status" style={{...note,marginTop:12}}>Loading published and draft templates from Supabase SQL…</p>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14,marginTop:16}}>
      <section style={panel}>
        <AppSelectField id="saas-template-scope" label="Template owner" value={scope}
          disabled={busy||loading} onChange={value=>{setScope(value);setRequestId(crypto.randomUUID());}}
          options={[{value:"global",label:"Convay starter marketplace"},
            ...(companies?.companies??[]).filter(c=>c.lifecycle_state!=="offboarded")
              .map(c=>({value:c.id,label:c.display_name+" · "+c.lifecycle_state}))]}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginTop:14}}>
          <h3 style={{fontWeight:650}}>Stored templates ({templates.length})</h3>
          <Button variant="secondary" size="sm" disabled={busy||loading}
            onClick={()=>{setLoading(true);setError("");void reload().catch(e=>setError(e instanceof Error?e.message:"SQL refresh failed"))
              .finally(()=>setLoading(false));}}>Refresh SQL</Button>
        </div>
        {!loading&&templates.length===0&&<p style={note}>No templates saved for this owner.</p>}
        {templates.map(item=><div key={item.id} style={{borderTop:"1px solid var(--border-color,#dce1e8)",padding:"10px 0"}}>
          <Button variant={selected?.id===item.id?"primary":"secondary"} size="sm"
            disabled={busy} onClick={()=>void edit(item)}>{item.title}</Button>
          <p style={note}>Revision {item.revision} · Published {item.published_revision??"none"}</p>
        </div>)}
        <Button variant="secondary" size="sm" disabled={busy} onClick={()=>{
          setSelected(null);setSourceId("");setDraft(freshDraft());setRequestId(crypto.randomUUID());setError("");
        }}>New draft</Button>
        {tenantId&&<div style={{marginTop:14,borderTop:"1px solid var(--border-color,#dce1e8)",paddingTop:14}}>
          <AppSelectField id="saas-marketplace-source" label="Copy published Convay starter"
            value={sourceId} onChange={value=>{setSourceId(value);setRequestId(crypto.randomUUID());setError("");}} disabled={busy}
            options={[{value:"",label:"Select a published starter"},
              ...starters.map(t=>({value:t.id,label:t.title+" · v"+t.published_revision}))]}/>
          <p style={{...note,marginTop:6}}>Set the new title and unique key in the editor, then choose Copy starter.</p>
        </div>}
      </section>
      <section style={panel}>
        <h3 style={{fontWeight:650,marginBottom:12}}>{selected?"Revise template":"New meeting template draft"}</h3>
        <div style={{display:"grid",gap:12}}>
          <AppTextField id="saas-template-title" label="Meeting type name" required
            value={draft.title} onChange={title=>updateDraft(d=>({...d,title}))}/>
          <AppTextField id="saas-template-key" label="Template key" required
            helper="Lowercase unique key, e.g. board_meeting"
            value={draft.key} disabled={!!selected}
            onChange={key=>updateDraft(d=>({...d,key}))}/>
          <AppTextField id="saas-template-description" label="Description"
            value={draft.description} onChange={description=>updateDraft(d=>({...d,description}))}/>
        </div>
        <div style={{marginTop:18,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
          <h4 style={{fontWeight:650}}>Meeting creation steps ({draft.definition.steps.length})</h4>
          <Button variant="secondary" size="sm" disabled={busy||draft.definition.steps.length>=20}
            onClick={addStep}>Add step</Button>
        </div>
        {draft.definition.steps.map((step,i)=><section key={step.id}
          style={{borderTop:"1px solid var(--border-color,#dce1e8)",padding:"12px 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{flex:1}}>
              <AppTextField id={"saas-step-"+step.id} label={"Step "+(i+1)+" title"} required
                value={step.title} onChange={title=>updateStep(i,{title})}/>
            </div>
            <Button size="sm" variant="tertiary" disabled={busy||draft.definition.steps.length===1}
              onClick={()=>updateSteps(draft.definition.steps.filter((_,j)=>j!==i))}>Remove</Button>
          </div>
          {step.fields.map((field,j)=><div key={field.id} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8,marginTop:10}}>
            <AppTextField id={"saas-field-"+field.id} label="Field label" value={field.label}
              onChange={label=>updateField(i,j,{label})}/>
            <AppSelectField id={"saas-type-"+field.id} label="Field type" value={field.type}
              onChange={type=>updateField(i,j,{type:type as MeetingFieldType})}
              options={fieldTypes.map(type=>({value:type,label:type.replace(/_/g," ")}))}/>
            <AppSelectField id={"saas-required-"+field.id} label="Required" value={field.required?"yes":"no"}
              onChange={v=>updateField(i,j,{required:v==="yes"})}
              options={[{value:"yes",label:"Required"},{value:"no",label:"Optional"}]}/>
            {["select","multiselect"].includes(field.type)&&<AppTextField
              id={"saas-options-"+field.id} label="Options (comma-separated)"
              value={(field.options??[]).join(", ")}
              onChange={value=>updateField(i,j,{options:value.split(",").map(t=>t.trim()).filter(Boolean)})}/>}
            <Button size="sm" variant="tertiary" disabled={busy}
              onClick={()=>updateStep(i,{fields:step.fields.filter((_,k)=>k!==j)})}>Remove field</Button>
          </div>)}
          <Button size="sm" variant="secondary" disabled={busy||step.fields.length>=30}
            onClick={()=>addField(i)}>Add field</Button>
        </section>)}
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:14}}>
          <Button disabled={busy||loading} loading={busy} onClick={()=>void save(selected?"revise":"create")}>
            {selected?"Save new revision":"Save draft"}
          </Button>
          {selected?.state==="draft"&&<Button variant="secondary" disabled={busy}
            onClick={()=>setConfirmPublish({template:selected,requestId:crypto.randomUUID()})}>
            Publish revision
          </Button>}
          {tenantId&&sourceId&&<Button variant="secondary" disabled={busy}
            onClick={()=>void save("copy")}>Copy starter to company</Button>}
        </div>
        <p role="status" style={{...note,marginTop:10}}>Publishing a template does not enable a paid tenant, change an existing meeting or grant access to LiveKit.</p>
      </section>
    </div>
    {confirmPublish&&<SConfirmModal
      title="Publish this meeting template version?"
      message={"Publish immutable revision "+confirmPublish.template.current_revision+" of "+confirmPublish.template.title+"? Existing meeting records will not be changed."}
      confirmLabel="Publish revision"
      onClose={()=>{if(!busy)setConfirmPublish(null);}}
      onConfirm={()=>void publish()}
    />}
  </section>;
}
