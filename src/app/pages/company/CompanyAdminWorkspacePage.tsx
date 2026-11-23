import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/buttons/Button";
import { AppTextField } from "../../components/forms/AppTextField";
import { SConfirmModal } from "../../components/modals/SConfirmModal";
import { useAccessSnapshot } from "../../services/supabase/convayAccess";
import {
  listCompanies, readCompany, enrollVerifiedCompanyMember, revokeCompanyMember,
  type CompanyDirectory, type CompanyProfile,
} from "../../services/saas/companyDirectory";

/**
 * This workspace only reads companies returned by the authenticated SQL RPC.
 * The Platform Super Admin controls company creation and tenant-admin grants
 * separately in Subscriptions Management. No tenant activation is implied.
 */
type Confirmation =
  | { action:"assign";tenantId:string;email:string;requestId:string }
  | { action:"revoke";tenantId:string;userId:string;label:string;requestId:string };

const surface:React.CSSProperties={
  border:"1px solid var(--border-color,#dce1e8)",borderRadius:14,
  padding:18,background:"var(--card-bg,var(--surface,white))",
};
const note:React.CSSProperties={
  color:"var(--text-secondary,#64748b)",fontSize:13,lineHeight:1.5,
};

export function CompanyAdminWorkspacePage(){
  const access=useAccessSnapshot();
  const allowedIds=access.company_admin_tenant_ids??[];
  const allowedKey=[...allowedIds].sort().join(",");
  const [directory,setDirectory]=useState<CompanyDirectory|null>(null);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [profile,setProfile]=useState<CompanyProfile|null>(null);
  const [loading,setLoading]=useState(true);
  const [working,setWorking]=useState(false);
  const [error,setError]=useState("");
  const [email,setEmail]=useState("");
  const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
  const [confirmation,setConfirmation]=useState<Confirmation|null>(null);

  useEffect(()=>{
    let active=true;
    setDirectory(null);setProfile(null);setError("");
    if(!access.loaded||access.is_super_admin||!allowedKey){
      setLoading(false);setSelectedId(null);
      return ()=>{active=false;};
    }
    setLoading(true);
    void listCompanies().then(result=>{
      if(!active)return;
      // The current SQL directory is authoritative. A stale client access
      // snapshot cannot expand it, and scope change clears old company data.
      if(result.companies.some(company=>!allowedIds.includes(company.id)))
        throw new Error("Company scope changed; sign in again to verify access");
      setDirectory(result);
      setSelectedId(current=>current&&result.companies.some(x=>x.id===current)
        ? current : result.companies[0]?.id??null);
    }).catch(reason=>{
      if(active)setError(reason instanceof Error?reason.message:"Unable to verify company membership");
    }).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  // Recheck membership whenever the server-derived scope changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[access.loaded,access.is_super_admin,allowedKey]);

  useEffect(()=>{
    let active=true;
    setProfile(null);setError("");
    if(!selectedId||!directory?.companies.some(x=>x.id===selectedId)
      ||!allowedIds.includes(selectedId))return ()=>{active=false;};
    setLoading(true);
    void readCompany(selectedId).then(record=>{
      if(active&&record.company.id===selectedId)setProfile(record);
    }).catch(reason=>{
      if(active)setError(reason instanceof Error?reason.message:"Unable to verify company details");
    }).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[selectedId,directory,allowedKey]);

  const reload=async(tenantId:string)=>{
    const [scope,details]=await Promise.all([listCompanies(),readCompany(tenantId)]);
    if(!scope.companies.some(x=>x.id===tenantId)||!allowedIds.includes(tenantId)
      ||details.company.id!==tenantId)
      throw new Error("Company permission no longer exists; refresh your account access");
    setDirectory(scope);setProfile(details);
  };
  const submit=async()=>{
    const action=confirmation;
    if(!action||working||loading||!allowedIds.includes(action.tenantId))return;
    setWorking(true);setError("");
    try{
      if(action.action==="assign"){
        await enrollVerifiedCompanyMember(action.tenantId,action.email,"member",action.requestId);
      }else{
        await revokeCompanyMember(action.tenantId,action.userId,action.requestId);
      }
      await reload(action.tenantId);
      if(action.action==="assign"){setEmail("");setRequestId(crypto.randomUUID());}
      setConfirmation(null);
      toast.success(action.action==="assign"
        ?"Company member verified in SQL":"Company membership revocation verified in SQL");
    }catch(reason){
      setError(reason instanceof Error?reason.message:"Company action could not be verified");
    }finally{setWorking(false);}
  };
  const canUse=access.loaded&&!access.is_super_admin&&allowedIds.length>0;

  return <main className="table-page" aria-label="Company management">
    <div style={{marginBottom:18}}>
      <h1 style={{fontSize:23,fontWeight:700}}>My Company</h1>
      <p style={note}>Manage company members and review meeting-template status from your company's verified SQL profile.</p>
    </div>
    {!canUse && <section style={surface}><p role="alert">No authorized Company Super Admin membership is available. Ask the Convay Platform Super Admin to assign your account to a company.</p></section>}
    {canUse&&<section style={surface}>
      <div style={{display:"flex",alignItems:"center",gap:12,justifyContent:"space-between",flexWrap:"wrap"}}>
        <h2 style={{fontWeight:650,fontSize:17}}>Authorized companies</h2>
        <Button variant="secondary" size="sm" disabled={loading||working||!selectedId}
          onClick={()=>{if(!selectedId)return;setLoading(true);setError("");
            void reload(selectedId).catch(e=>{setProfile(null);setError(e instanceof Error?e.message:"Unable to refresh company");})
              .finally(()=>setLoading(false));}}>Refresh SQL</Button>
      </div>
      {loading&&<p role="status" style={{...note,marginTop:10}}>Verifying company data…</p>}
      {error&&<p role="alert" style={{...note,color:"#b91c1c",marginTop:10}}>{error}</p>}
      {directory&&directory.companies.length===0&&<p style={note}>No currently authorized company.</p>}
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:12}}>
        {directory?.companies.map(company=><Button key={company.id}
          variant={selectedId===company.id?"primary":"secondary"} size="sm"
          disabled={working||loading} onClick={()=>setSelectedId(company.id)}>
          {company.display_name}
        </Button>)}
      </div>
    </section>}
    {canUse&&profile&&profile.company.id===selectedId&&<div style={{display:"grid",
      gridTemplateColumns:"repeat(auto-fit,minmax(270px,1fr))",gap:16,marginTop:16}}>
      <section style={surface} aria-label="Company profile and subscription">
        <h2 style={{fontSize:17,fontWeight:650}}>{profile.company.display_name}</h2>
        <p style={{...note,marginTop:10}}>Company lifecycle: <strong>{profile.company.lifecycle_state}</strong></p>
        <p style={{...note,marginTop:8}}>Company ID: {profile.company.id}</p>
        <p style={{...note,marginTop:8}}>Subscription: Not activated</p>
        <p style={{...note,marginTop:8}}>Meeting workspace: Not activated</p>
        <p style={{...note,marginTop:8}}>SQL/Storage/LiveKit tenant isolation: Not certified</p>
      </section>
      <section style={surface} aria-label="Company members">
        <h2 style={{fontSize:17,fontWeight:650}}>Company users ({profile.members.length})</h2>
        <p style={{...note,marginTop:8}}>Add an existing verified Convay user as a member. Company Super Admin appointments and new email invitations are handled by the Platform Super Admin.</p>
        <div style={{marginTop:14}}>
          <AppTextField id="my-company-member-email" label="Verified user email" required
            value={email} disabled={working||loading}
            onChange={next=>{setEmail(next);setRequestId(crypto.randomUUID());setError("");}}
            placeholder="user@example.com"/>
          <Button variant="secondary" size="sm"
            disabled={working||loading||!/^\S+@\S+\.\S+$/.test(email.trim())}
            onClick={()=>setConfirmation({action:"assign",tenantId:profile.company.id,
              email:email.trim().toLowerCase(),requestId})}>
            Add company member
          </Button>
        </div>
        {profile.members.length===0&&<p style={{...note,marginTop:12}}>No company memberships recorded.</p>}
        {profile.members.map(member=><div key={member.user_id}
          style={{borderTop:"1px solid var(--border-color,#dce1e8)",padding:"12px 0"}}>
          <strong style={{fontSize:13}}>{member.display_name}</strong>
          <p style={note}>{member.email}</p>
          <p style={note}>{member.membership_role==="tenant_admin"?"Company Super Admin":"Member"} · {member.membership_state}</p>
          {member.membership_state==="active"&&member.membership_role==="member"&&
            <Button variant="tertiary" size="sm" disabled={working||loading}
              onClick={()=>setConfirmation({action:"revoke",tenantId:profile.company.id,
                userId:member.user_id,label:member.display_name,requestId:crypto.randomUUID()})}>
              Revoke membership
            </Button>}
        </div>)}
      </section>
      <section style={surface} aria-label="Company templates and audit">
        <h2 style={{fontSize:17,fontWeight:650}}>Meeting templates ({profile.templates.length})</h2>
        {profile.templates.length===0&&<p style={{...note,marginTop:10}}>No company meeting templates saved yet.</p>}
        {profile.templates.map(t=><p key={t.id} style={{...note,marginTop:12}}>
          <strong>{t.title}</strong> · Version {t.current_revision} · Published {t.published_revision??"none"}
        </p>)}
        <h3 style={{fontWeight:650,fontSize:15,marginTop:18}}>Administrative history ({profile.events.length})</h3>
        {profile.events.length===0&&<p style={{...note,marginTop:10}}>No events recorded.</p>}
        {profile.events.map(event=><p key={event.id} style={{...note,marginTop:10}}>
          {event.action.replace(/_/g," ")} · {new Date(event.occurred_at).toLocaleString()}
        </p>)}
      </section>
    </div>}
    {confirmation&&<SConfirmModal
      title={confirmation.action==="assign"?"Add company member?":"Revoke company membership?"}
      message={confirmation.action==="assign"
        ? `Assign ${confirmation.email} to this company? The account must already be verified and globally role-assigned. No paid workspace or meeting access will be activated.`
        : `Revoke ${confirmation.label}'s company membership? The change will be audited in SQL.`}
      confirmLabel={confirmation.action==="assign"?"Assign member":"Revoke membership"}
      danger={confirmation.action==="revoke"}
      onClose={()=>{if(!working)setConfirmation(null);}}
      onConfirm={()=>void submit()}
    />}
  </main>;
}
