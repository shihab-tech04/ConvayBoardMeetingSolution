import { useEffect, useMemo, useState } from "react";
import { Building2, CreditCard, FileText, Settings2, ShieldCheck, Receipt, RefreshCw, Database } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/buttons/Button";
import { AppTextField } from "../../components/forms/AppTextField";
import { AppSelectField } from "../../components/forms/AppSelectField";
import { SConfirmModal } from "../../components/modals/SConfirmModal";
import {
  PRICE_METRICS, emptyQuoteForm, buildQuotePayload, estimateQuote, displayMoney,
  subscriptionAction, assertSavedQuote, subscriptionAuditRead, assertSubscriptionAuditReadback,
  type SubscriptionAuditEvent,
  type QuoteForm, type SavedQuote, type SavedInvoice, type SubscriptionDirectory,
} from "../../services/saas/subscriptionQuotes";
import {
  createProvisioningCompany,listCompanies,readCompany,
  enrollVerifiedCompanyMember,revokeCompanyMember,
  listPendingCompanyInvitations,queuePendingCompanyInvitation,cancelPendingCompanyInvitation,
  type PendingCompanyInvitation,type CompanyDirectory,type CompanyProfile,type CompanyMembershipRole,
} from "../../services/saas/companyDirectory";
import { MeetingTemplateMarketplace } from "./MeetingTemplateMarketplace";

type Tab = "overview" | "pricing" | "billing" | "companies" | "templates" | "usage";
type PendingAction = { action: "issue_quote" | "void_quote" | "create_invoice" | "issue_invoice"; quote: SavedQuote; invoice?: SavedInvoice };
type PendingCompanyMembership =
  | {action:"enroll";tenantId:string;email:string;role:CompanyMembershipRole;requestId:string}
  | {action:"revoke";tenantId:string;userId:string;label:string;requestId:string};
const panel: React.CSSProperties = {
  padding: 20, border: "1px solid var(--border-color,#dce1e8)", borderRadius: 14,
  background: "var(--card-bg, var(--surface, white))",
};
const note: React.CSSProperties = { color:"var(--text-secondary,#64748b)", fontSize:13, lineHeight:1.5 };
const tabs: {id:Tab;label:string}[] = [
  {id:"overview",label:"Overview"},{id:"pricing",label:"Subscription builder"},
  {id:"billing",label:"Quotes & invoices"},{id:"companies",label:"Companies"},
  {id:"templates",label:"Meeting templates"},{id:"usage",label:"Usage & entitlements"},
];
const emptyDirectory: SubscriptionDirectory = {
  quotes: [], invoices: [], payment_provider_connected:false,
  usage_metering_activated:false,tenant_isolation_certified:false,
};

export function SubscribersPage() {
  const [tab,setTab] = useState<Tab>("overview");
  const [form,setForm] = useState<QuoteForm>(emptyQuoteForm);
  const [requestId,setRequestId] = useState(() => crypto.randomUUID());
  const [directory,setDirectory] = useState<SubscriptionDirectory>(emptyDirectory);
  const [loading,setLoading] = useState(true);
  const [working,setWorking] = useState(false);
  const [error,setError] = useState("");
  const [preview,setPreview] = useState<ReturnType<typeof estimateQuote>|null>(null);
  const [selectedQuote,setSelectedQuote] = useState<string|null>(null);
  const [pending,setPending] = useState<PendingAction|null>(null);
  const [auditEvents,setAuditEvents] = useState<SubscriptionAuditEvent[]|null>(null);
  const [auditError,setAuditError] = useState("");
  const [auditLoading,setAuditLoading] = useState(false);
  const [companies,setCompanies] = useState<CompanyDirectory|null>(null);
  const [companyProfile,setCompanyProfile] = useState<CompanyProfile|null>(null);
  const [selectedCompanyId,setSelectedCompanyId] = useState<string|null>(null);
  const [companyName,setCompanyName] = useState("");
  const [companyRequestId,setCompanyRequestId] = useState(() => crypto.randomUUID());
  const [companyError,setCompanyError] = useState("");
  const [companyLoading,setCompanyLoading] = useState(false);
  const [companyWorking,setCompanyWorking] = useState(false);
  const [confirmProvision,setConfirmProvision] = useState(false);
  const [memberEmail,setMemberEmail] = useState("");
  const [memberRole,setMemberRole] = useState<CompanyMembershipRole>("member");
  const [memberRequestId,setMemberRequestId] = useState(()=>crypto.randomUUID());
  const [pendingMembership,setPendingMembership] = useState<PendingCompanyMembership|null>(null);
  const [companyInviteReadback,setCompanyInviteReadback]=useState<{
    tenantId:string;invites:PendingCompanyInvitation[];
  }|null>(null);
  const companyInvites=companyInviteReadback && companyInviteReadback.tenantId===selectedCompanyId
    ? companyInviteReadback.invites : null;
  const [invitationEmail,setInvitationEmail]=useState("");
  const [invitationRole,setInvitationRole]=useState<CompanyMembershipRole>("member");
  const [invitationRequestId,setInvitationRequestId]=useState(()=>crypto.randomUUID());
  const [invitationLoading,setInvitationLoading]=useState(false);
  const [invitationWorking,setInvitationWorking]=useState(false);
  const [invitationError,setInvitationError]=useState("");
  const [invitationConfirmation,setInvitationConfirmation]=useState<
    {action:"queue"|"cancel";tenantId:string;email:string;role:CompanyMembershipRole;requestId:string}|null>(null);

  // Company-specific input and confirmations must never carry into another tenant.
  const companyActionPending=companyWorking||invitationWorking||!!pendingMembership||!!invitationConfirmation||confirmProvision;
  const resetCompanyOnboardingDrafts=()=>{
    setCompanyInviteReadback(null);setInvitationError("");setCompanyError("");
    setMemberEmail("");setMemberRole("member");setMemberRequestId(crypto.randomUUID());
    setInvitationEmail("");setInvitationRole("member");setInvitationRequestId(crypto.randomUUID());
    setPendingMembership(null);setInvitationConfirmation(null);
  };
  const selectCompany=(tenantId:string)=>{
    if(companyActionPending||tenantId===selectedCompanyId)return;
    resetCompanyOnboardingDrafts();setCompanyProfile(null);setSelectedCompanyId(tenantId);
  };
  const refresh = async () => {
    const result = await subscriptionAction<SubscriptionDirectory>("list");
    if (!Array.isArray(result.quotes) || !Array.isArray(result.invoices)) {
      throw new Error("SQL returned an invalid subscription directory");
    }
    setDirectory(result);
    return result;
  };
  useEffect(() => {
    let active = true;
    setLoading(true);
    void subscriptionAction<SubscriptionDirectory>("list").then(result => {
      if (!active) return;
      if (!Array.isArray(result.quotes) || !Array.isArray(result.invoices)) throw new Error("Invalid subscription directory");
      setDirectory(result);
      setError("");
    }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : "Unable to read subscriptions");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  // Company lifecycle is a separate authenticated SQL contract from quote pricing.
  // A quote cannot implicitly provision or activate a tenant.
  useEffect(() => {
    if (tab!=="companies") return;
    let active=true;
    setCompanyLoading(true);setCompanyError("");
    void listCompanies().then(value => { if (active) setCompanies(value); })
      .catch(reason => { if (active) setCompanyError(reason instanceof Error ? reason.message : "Unable to load SQL companies"); })
      .finally(() => { if (active) setCompanyLoading(false); });
    return () => { active=false; };
  },[tab]);
  useEffect(() => {
    if (tab!=="companies" || !selectedCompanyId) {
      setCompanyProfile(null);
      return;
    }
    let active=true;
    setCompanyLoading(true);setCompanyError("");
    void readCompany(selectedCompanyId).then(value => { if (active) setCompanyProfile(value); })
      .catch(reason => { if (active) {setCompanyProfile(null);setCompanyError(reason instanceof Error ? reason.message : "Unable to verify company details");} })
      .finally(() => { if (active) setCompanyLoading(false); });
    return () => { active=false; };
  },[tab,selectedCompanyId]);
  useEffect(()=>{
    let active=true;
    setCompanyInviteReadback(null);setInvitationError("");
    if(tab!=="companies"||!selectedCompanyId){setInvitationLoading(false);return ()=>{active=false;};}
    const tenantId=selectedCompanyId;
    setInvitationLoading(true);
    void listPendingCompanyInvitations(tenantId).then(records=>{
      if(active)setCompanyInviteReadback({tenantId,invites:records});
    }).catch(reason=>{
      if(active)setInvitationError(reason instanceof Error?reason.message:"Unable to load company invitation SQL");
    }).finally(()=>{if(active)setInvitationLoading(false);});
    return ()=>{active=false;};
  },[tab,selectedCompanyId]);
  const commitCompanyInvitation=async()=>{
    const action=invitationConfirmation;
    if(!action||invitationWorking||invitationLoading)return;
    if(tab!=="companies"||action.tenantId!==selectedCompanyId){
      setInvitationConfirmation(null);setInvitationError("Company selection changed. Reopen the invitation action.");return;
    }
    setInvitationWorking(true);setInvitationError("");
    try{
      const result=action.action==="queue"
        ? await queuePendingCompanyInvitation(action.tenantId,action.email,action.role,action.requestId)
        : await cancelPendingCompanyInvitation(action.tenantId,action.email,action.requestId);
      setCompanyInviteReadback({tenantId:action.tenantId,invites:result.invites});
      if(action.action==="queue"){
        setInvitationEmail("");setInvitationRole("member");
        setInvitationRequestId(crypto.randomUUID());
      }
      setInvitationConfirmation(null);
      toast.success(action.action==="queue"
        ?"Pending invitation linked to company in SQL"
        :"Pending company invitation cancelled in SQL");
    }catch(reason){
      setInvitationError(reason instanceof Error?reason.message:"Company invitation was not verified");
    }finally{setInvitationWorking(false);}
  };
  const saveCompanyMembership=async()=>{
    const pending=pendingMembership;
    if(!pending||companyWorking||companyLoading)return;
    if(tab!=="companies"||pending.tenantId!==selectedCompanyId){
      setPendingMembership(null);setCompanyError("Company selection changed. Reopen the membership action.");return;
    }
    setCompanyWorking(true);setCompanyError("");
    try{
      const result=pending.action==="enroll"
        ? await enrollVerifiedCompanyMember(pending.tenantId,pending.email,pending.role,pending.requestId)
        : await revokeCompanyMember(pending.tenantId,pending.userId,pending.requestId);
      setCompanyProfile(result.profile);
      setCompanies(await listCompanies());
      if(pending.action==="enroll"){
        setMemberEmail("");
        setMemberRole("member");
        setMemberRequestId(crypto.randomUUID());
      }
      toast.success(pending.action==="enroll"
        ?"Verified company membership saved in SQL"
        :"Membership revoked and verified in SQL");
      setPendingMembership(null);
    }catch(reason){
      setCompanyError(reason instanceof Error?reason.message:"Unable to verify company membership");
    }finally{setCompanyWorking(false);}
  };
  const provisionCompany = async () => {
    if (companyWorking || companyLoading) return;
    setCompanyWorking(true);setCompanyError("");
    try {
      const verified=await createProvisioningCompany(companyName,companyRequestId);
      const directory=await listCompanies();
      if (!directory.companies.some(item => item.id===verified.company.id))
        throw new Error("Company saved but directory readback is incomplete. Refresh before retrying.");
      setCompanies(directory);
      resetCompanyOnboardingDrafts();
      setSelectedCompanyId(verified.company.id);
      setCompanyProfile(verified);
      setCompanyName("");
      setCompanyRequestId(crypto.randomUUID());
      toast.success("Company provisioning record verified in SQL");
    } catch(reason) {
      setCompanyError(reason instanceof Error ? reason.message : "Unable to verify company provisioning");
    } finally {
      setCompanyWorking(false);setConfirmProvision(false);
    }
  };

  const change = (update: (prev:QuoteForm)=>QuoteForm) => {
    setForm(update);
    setRequestId(crypto.randomUUID());
    setPreview(null);
    setError("");
  };
  const setField = <K extends keyof Pick<QuoteForm,"organization_name"|"contact_email"|"currency"|"billing_cycle"|"quota_policy"|"base"|"discount"|"tax">>(
    key:K, value:QuoteForm[K],
  ) => change(prev=>({...prev,[key]:value}));
  const setMetric = (kind:"quantities"|"rates", metric:(typeof PRICE_METRICS)[number]["key"],value:string) =>
    change(prev=>({...prev,[kind]:{...prev[kind],[metric]:value}}));
  const estimate = useMemo(()=>{
    try {return estimateQuote(buildQuotePayload(form,requestId));}
    catch {return null;}
  },[form,requestId]);
  const totalCurrency = (amount:number) => displayMoney(amount,form.currency);

  const previewSql = async () => {
    setWorking(true);setError("");
    try {
      const payload=buildQuotePayload(form,requestId);
      const response=await subscriptionAction<{preview:ReturnType<typeof estimateQuote>}>("preview_quote",payload);
      const local=estimateQuote(payload);
      if (!response.preview || response.preview.total_minor!==local.total_minor) throw new Error("Quote preview does not match SQL. Check pricing and retry.");
      setPreview(response.preview);
      toast.success("Server pricing calculation verified");
    }catch(reason){setError(reason instanceof Error?reason.message:"Unable to calculate the quote");}
    finally{setWorking(false);}
  };
  const saveQuote = async () => {
    setWorking(true);setError("");
    try {
      const payload=buildQuotePayload(form,requestId);
      const confirmation=await subscriptionAction<{quote?:SavedQuote}>("create_quote",payload);
      const latest=await refresh();
      const saved=assertSavedQuote(confirmation,payload,latest);
      setSelectedQuote(saved.id);
      setRequestId(crypto.randomUUID());
      setPreview(saved.quote_breakdown);
      toast.success("Quote saved and verified in Supabase");
      setTab("billing");
    }catch(reason){setError(reason instanceof Error?reason.message:"Unable to save quote");}
    finally{setWorking(false);}
  };
  const confirmAction = async () => {
    if (!pending || working) return;
    setWorking(true);setError("");
    const {quote,action}=pending;
    try {
      const data = action==="issue_quote"||action==="void_quote"
        ? {quote_id:quote.id,expected_revision:quote.revision}:{quote_id:quote.id};
      await subscriptionAction(action,data);
      const after=await refresh();
      const q=after.quotes.find(x=>x.id===quote.id);
      const invoice=after.invoices.find(x=>x.quote_id===quote.id);
      if ((action==="issue_quote"&&q?.status!=="issued")
        ||(action==="void_quote"&&q?.status!=="void")
        ||(action==="create_invoice"&&invoice?.status!=="draft")
        ||(action==="issue_invoice"&&invoice?.status!=="issued")) {
        throw new Error("SQL did not confirm the status transition");
      }
      setPending(null);
      toast.success("Server status and audit record verified");
    }catch(reason){setError(reason instanceof Error?reason.message:"Unable to confirm the operation");}
    finally{setWorking(false);}
  };
  const quotes=directory.quotes;
  const invoices=directory.invoices;
  const selected=quotes.find(q=>q.id===selectedQuote)??quotes[0]??null;
  const selectedInvoice=selected ? invoices.find(i=>i.quote_id===selected.id) : null;
  useEffect(() => {
    let active=true;
    setAuditEvents(null);
    setAuditError("");
    if (tab!=="billing" || !selected) return () => { active=false; };
    setAuditLoading(true);
    void subscriptionAuditRead(selected.id).then(result => {
      const events=assertSubscriptionAuditReadback(result,selected.id,selected.revision);
      if (active) setAuditEvents(events);
    }).catch(reason => {
      if (active) setAuditError(reason instanceof Error?reason.message:"Unable to load SQL billing history");
    }).finally(() => { if (active) setAuditLoading(false); });
    return () => { active=false; };
  }, [tab,selected?.id,selected?.revision,selectedInvoice?.status]);

  return (
    <main className="table-page" style={{maxWidth:1320,margin:"0 auto",padding:"24px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:700,marginBottom:6}}>Subscriptions Management</h1>
          <p style={{...note,maxWidth:700}}>Company proposals, pricing, draft invoices and the staged SaaS control plane.</p>
        </div>
        <Button variant="secondary" size="md" onClick={()=>{setLoading(true);void refresh().catch(e=>setError(e.message)).finally(()=>setLoading(false));}}
          disabled={loading||working} leadingIcon={RefreshCw}>Refresh SQL</Button>
      </div>
      {error && <p role="alert" style={{color:"#b91c1c",margin:"14px 0"}}>{error}</p>}
      <nav aria-label="Subscription management sections" style={{display:"flex",flexWrap:"wrap",gap:8,margin:"24px 0"}}>
        {tabs.map(t=><Button key={t.id} size="sm" variant={tab===t.id?"primary":"secondary"}
          aria-pressed={tab===t.id} disabled={tab==="companies"&&t.id!==tab&&companyActionPending}
          onClick={()=>{if(tab!=="companies"||!companyActionPending)setTab(t.id);}}>{t.label}</Button>)}
      </nav>
      {loading && <p role="status">Loading subscription records from SQL…</p>}

      {tab==="overview" && <section aria-label="Subscription overview">
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14}}>
          {[
            {label:"Quotes",value:quotes.length,Icon:FileText},
            {label:"Issued quotes",value:quotes.filter(q=>q.status==="issued").length,Icon:CreditCard},
            {label:"Invoice drafts / issued",value:invoices.length,Icon:Receipt},
            {label:"Verified usage meters",value:directory.usage_metering_activated?"Active":"Not activated",Icon:Database},
          ].map(c=><article key={c.label} style={panel}><c.Icon size={19}/><div style={{fontSize:25,fontWeight:700,marginTop:10}}>{c.value}</div><p style={note}>{c.label}</p></article>)}
        </div>
        <section style={{...panel,marginTop:18}}>
          <h2 style={{fontWeight:650,fontSize:18,marginBottom:12}}>Lifecycle and controls</h2>
          <p style={note}>A Platform Super Admin can calculate, save and issue subscription proposals, then create and issue corresponding invoice records. Quotes and invoices are not payments or active subscriptions. Company onboarding, tenant-wide quotas and actual usage capture must remain disabled until isolation and provider gates are verified.</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:14}}>
            <Button variant="primary" onClick={()=>setTab("pricing")}>Configure quote</Button>
            <Button variant="secondary" onClick={()=>setTab("billing")}>View SQL billing records</Button>
          </div>
        </section>
      </section>}

      {tab==="pricing" && <section aria-label="Subscription quote configurator">
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:16,alignItems:"start"}}>
          <div style={{...panel,display:"flex",flexDirection:"column",gap:15}}>
            <h2 style={{fontWeight:650,fontSize:18}}>Subscription breakdown</h2>
            <AppTextField id="sub-company" label="Company name" value={form.organization_name}
              onChange={v=>setField("organization_name",v)} required placeholder="Registered company name"/>
            <AppTextField id="sub-email" label="Company contact email" value={form.contact_email}
              onChange={v=>setField("contact_email",v)} required placeholder="contact@example.com"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <AppSelectField id="sub-currency" label="Currency" value={form.currency}
                onChange={v=>setField("currency",v as QuoteForm["currency"])} options={["BDT","USD"]}/>
              <AppSelectField id="sub-cycle" label="Billing cycle" value={form.billing_cycle}
                onChange={v=>setField("billing_cycle",v as QuoteForm["billing_cycle"])}
                options={[{value:"monthly",label:"Monthly"},{value:"annually",label:"Annually"}]}/>
            </div>
            <p style={{...note,marginTop:0}}>Enter the quantities and negotiated prices per unit. No production price list or charge is assumed.</p>
            {PRICE_METRICS.map(item=>(
              <div key={item.key} style={{borderTop:"1px solid var(--border-color,#dce1e8)",paddingTop:12}}>
                <p style={{fontWeight:600,marginBottom:8}}>{item.label}</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <AppTextField id={"sub-q-"+item.key} label={"Quantity ("+item.unit+")"}
                    value={form.quantities[item.key]} onChange={v=>setMetric("quantities",item.key,v)}
                    inputMode="numeric"/>
                  <AppTextField id={"sub-p-"+item.key} label={"Price / "+item.unit}
                    value={form.rates[item.key]} onChange={v=>setMetric("rates",item.key,v)}
                    inputMode="decimal" helper={form.currency+" per unit"}/>
                </div>
              </div>
            ))}
            <AppTextField id="sub-base" label="Base subscription fee" value={form.base}
              onChange={v=>setField("base",v)} inputMode="decimal" helper="For the selected billing cycle"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <AppTextField id="sub-discount" label="Discount %" value={form.discount}
                onChange={v=>setField("discount",v)} inputMode="decimal"/>
              <AppTextField id="sub-tax" label="Tax %" value={form.tax}
                onChange={v=>setField("tax",v)} inputMode="decimal"/>
            </div>
            <AppSelectField id="sub-limit" label="Overage policy" value={form.quota_policy}
              onChange={v=>setField("quota_policy",v as QuoteForm["quota_policy"])}
              options={[{value:"soft",label:"Soft limit / alert proposal"},{value:"hard",label:"Hard limit proposal"}]}
              helper="Policy is contractual until trusted usage metering is activated."/>
          </div>
          <aside style={{...panel,position:"sticky",top:24}} aria-label="Calculated subscription amount">
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:14}}><CreditCard size={19}/><h2 style={{fontWeight:650,fontSize:18}}>Proposed amount</h2></div>
            <p style={note}>{form.billing_cycle==="monthly"?"Monthly":"Annual"} billing cycle · {form.currency}</p>
            <div style={{fontSize:28,fontWeight:750,margin:"14px 0"}}>{estimate?totalCurrency(estimate.total_minor):"—"}</div>
            {estimate ? <>
              {estimate.lines.map(l=><div key={l.key} style={{display:"flex",justifyContent:"space-between",gap:10,marginBottom:10,fontSize:13}}>
                <span>{PRICE_METRICS.find(k=>k.key===l.key)?.label} ({l.quantity})</span>
                <strong>{totalCurrency(l.total_minor)}</strong>
              </div>)}
              <hr style={{borderColor:"var(--border-color,#dce1e8)",margin:"14px 0"}}/>
              {[["Base fee",estimate.base_minor],["Subtotal",estimate.subtotal_minor],["Discount", -estimate.discount_minor],["Tax",estimate.tax_minor]].map(([name,v])=>
                <div key={String(name)} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:9}}>
                  <span>{name}</span><strong>{totalCurrency(Number(v))}</strong>
                </div>
              )}
            </> : <p style={note}>Enter valid company details, quantities and prices to calculate the estimate.</p>}
            {preview && <p role="status" style={{...note,marginTop:12}}>Pricing calculation confirmed by SQL: {totalCurrency(preview.total_minor)}</p>}
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:20}}>
              <Button variant="secondary" onClick={()=>void previewSql()} loading={working} disabled={!estimate}>Verify pricing</Button>
              <Button variant="primary" onClick={()=>void saveQuote()} loading={working} disabled={!estimate}>Save quote to SQL</Button>
            </div>
            <p style={{...note,marginTop:12}}>This is a proposal, not a payment. No invoice is issued until an administrator confirms the quote.</p>
          </aside>
        </div>
      </section>}

      {tab==="billing" && <section aria-label="Quotes and invoice records">
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:16,alignItems:"start"}}>
          <section style={panel}>
            <h2 style={{fontSize:18,fontWeight:650,marginBottom:14}}>Saved SQL quotes ({quotes.length})</h2>
            {!quotes.length && <p style={note}>No quotes yet. Create one from the Subscription builder.</p>}
            {quotes.map(q=><button type="button" key={q.id} onClick={()=>setSelectedQuote(q.id)}
              aria-pressed={selected?.id===q.id} style={{
                display:"block",width:"100%",textAlign:"left",padding:"12px 10px",cursor:"pointer",
                background:selected?.id===q.id?"var(--surface-secondary,#eef1fa)":"transparent",
                border:"1px solid var(--border-color,#dce1e8)",borderRadius:10,marginBottom:8,
              }}>
              <strong>{q.organization_name}</strong><span style={{float:"right",fontSize:12}}>{q.status}</span>
              <div style={note}>{q.contact_email} · {displayMoney(q.total_minor,q.currency)}</div>
            </button>)}
          </section>
          <section style={panel}>
            <h2 style={{fontSize:18,fontWeight:650,marginBottom:12}}>Record details</h2>
            {!selected && <p style={note}>Select a quote to review its SQL status.</p>}
            {selected && <>
              <p><strong>{selected.organization_name}</strong></p>
              <p style={note}>{selected.contact_email}</p>
              <dl style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,margin:"16px 0"}}>
                <dt>Status</dt><dd>{selected.status}</dd>
                <dt>Billing cycle</dt><dd>{selected.billing_cycle}</dd>
                <dt>Overage policy</dt><dd>{selected.quota_policy}</dd>
                <dt>Revision</dt><dd>{selected.revision}</dd>
                <dt>Total</dt><dd><strong>{displayMoney(selected.total_minor,selected.currency)}</strong></dd>
                <dt>Invoice</dt><dd>{selectedInvoice?.status??"Not generated"}</dd>
              </dl>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {selected.status==="draft" && <Button size="sm" onClick={()=>setPending({action:"issue_quote",quote:selected})}>Issue quote</Button>}
                {selected.status!=="void" && <Button size="sm" variant="secondary"
                  onClick={()=>setPending({action:"void_quote",quote:selected})}>Void quote</Button>}
                {selected.status==="issued" && !selectedInvoice && <Button size="sm"
                  onClick={()=>setPending({action:"create_invoice",quote:selected})}>Create invoice draft</Button>}
                {selectedInvoice?.status==="draft" && <Button size="sm"
                  onClick={()=>setPending({action:"issue_invoice",quote:selected,invoice:selectedInvoice})}>Issue invoice</Button>}
              </div>
              <section aria-label="Verified billing audit history" style={{marginTop:20}}>
                <h3 style={{fontSize:15,fontWeight:650,marginBottom:8}}>Billing history · SQL audit</h3>
                {auditLoading && <p role="status" style={note}>Loading immutable audit events…</p>}
                {auditError && <p role="alert" style={{...note,color:"#b91c1c"}}>{auditError}</p>}
                {auditEvents && auditEvents.length===0 && <p style={note}>No recorded billing events for this quote.</p>}
                {auditEvents?.map(event=><article key={event.id} style={{
                  padding:"9px 0",borderTop:"1px solid var(--border-color,#dce1e8)",
                }}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap",fontSize:13}}>
                    <strong>{event.operation.replace(/_/g," ")}</strong>
                    <time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time>
                  </div>
                  <p style={note}>Event #{event.id} · recorded in Supabase</p>
                </article>)}
              </section>
              <p style={{...note,marginTop:16}}>Invoice payments, refunds and automated renewals are not enabled without a verified provider and financial reconciliation.</p>
            </>}
          </section>
        </div>
      </section>}

      {tab==="companies" && <section style={panel} aria-label="Verified company directory and 360 profile">
        <h2 style={{fontSize:19,fontWeight:650,marginBottom:12}}>Company onboarding & 360° profiles</h2>
        <p style={note}>Company records, verified memberships, template versions and administration history are loaded from Convay SQL. Creating a provisioning record does not activate a workspace or subscription.</p>
        <p role="status" style={{...note,marginTop:12}}>Tenant activation: {directory.tenant_isolation_certified?"Verified":"Not certified"} · Workspace access, subscription activation and LiveKit tenant isolation remain disabled until certified.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:14,marginTop:16}}>
          <div style={{...panel,padding:14}}>
            <h3 style={{fontWeight:650,marginBottom:12}}>Create provisioning company</h3>
            <AppTextField id="company-provisioning-name" label="Company name" required
              value={companyName} onChange={value=>{setCompanyName(value);setCompanyRequestId(crypto.randomUUID());setCompanyError("");}}
              placeholder="Registered organization name"/>
            <p style={{...note,marginTop:8}}>A Platform Super Admin can register an organization for onboarding. No user invitation, payment or tenant meeting is activated by this step.</p>
            <Button variant="primary" size="sm" disabled={companyWorking||companyLoading||companyName.trim().length<3||companyName.trim().length>160}
              onClick={()=>setConfirmProvision(true)}>Create provisioning record</Button>
          </div>
          <div style={{...panel,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
              <h3 style={{fontWeight:650}}>Company directory</h3>
              <Button variant="secondary" size="sm" disabled={companyLoading||companyWorking}
                onClick={()=>{setCompanyLoading(true);setCompanyError("");void listCompanies().then(setCompanies)
                  .catch(e=>setCompanyError(e instanceof Error?e.message:"Unable to refresh companies"))
                  .finally(()=>setCompanyLoading(false));}}>Refresh SQL</Button>
            </div>
            {companyLoading && <p role="status" style={note}>Checking company SQL records…</p>}
            {companyError && <p role="alert" style={{...note,color:"#b91c1c"}}>{companyError}</p>}
            {companies && companies.companies.length===0 && <p style={note}>No registered companies yet.</p>}
            {companies?.companies.map(company=><div key={company.id}
              style={{borderTop:"1px solid var(--border-color,#dce1e8)",padding:"10px 0"}}>
              <Button variant={company.id===selectedCompanyId?"primary":"secondary"} size="sm"
                disabled={companyActionPending} onClick={()=>selectCompany(company.id)}>{company.display_name}</Button>
              <p style={note}>{company.lifecycle_state} · {company.active_member_count} active members · {company.published_template_count} published templates</p>
            </div>)}
          </div>
        </div>
        {selectedCompanyId && companyProfile && companyProfile.company.id===selectedCompanyId && (
          <section aria-label="Selected company 360 detail" style={{marginTop:18}}>
            <h3 style={{fontSize:17,fontWeight:650}}>{companyProfile.company.display_name} · Company 360</h3>
            <p style={note}>Tenant ID: {companyProfile.company.id} · Status: {companyProfile.company.lifecycle_state}</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12,marginTop:12}}>
              <div style={{...panel,padding:14}}>
                <h4 style={{fontWeight:650}}>Users and access ({companyProfile.members.length})</h4>
                <p style={{...note,marginTop:8}}>Assign an existing email-verified Convay account with an active application role. Invite and verify new users in User Management first.</p>
                <div style={{display:"grid",gap:10,marginTop:12}}>
                  <AppTextField id="company-member-email" label="Verified user email" required
                    value={memberEmail} disabled={companyWorking||companyLoading}
                    onChange={value=>{setMemberEmail(value);setMemberRequestId(crypto.randomUUID());setCompanyError("");}}
                    placeholder="user@example.com"/>
                  <AppSelectField id="company-member-role" label="Company membership role" required
                    value={memberRole} disabled={companyWorking||companyLoading}
                    onChange={value=>{setMemberRole(value as CompanyMembershipRole);setMemberRequestId(crypto.randomUUID());}}
                    options={[{value:"member",label:"Company member"},
                      {value:"tenant_admin",label:"Company Super Admin"}]}/>
                  <Button variant="secondary" size="sm"
                    disabled={companyWorking||companyLoading||!/^\S+@\S+\.\S+$/.test(memberEmail.trim())}
                    onClick={()=>setPendingMembership({action:"enroll",tenantId:companyProfile.company.id,
                      email:memberEmail.trim(),role:memberRole,requestId:memberRequestId})}>
                    Assign verified account
                  </Button>
                </div>
                <p style={{...note,marginTop:12}}>Company membership does not activate paid workspace access or tenant meetings.</p>
                <section aria-label="Pending invitation company enrollment" style={{
                  borderTop:"1px solid var(--border-color,#dce1e8)",marginTop:18,paddingTop:14}}>
                  <h4 style={{fontWeight:650}}>Link a pending user invitation</h4>
                  <p style={{...note,marginTop:8}}>First invite the person through User Management. Assign their unaccepted invitation here; after verified first login, SQL will automatically enroll the account in this company. Workspaces and billing stay disabled.</p>
                  <div style={{display:"grid",gap:10,marginTop:12}}>
                    <AppTextField id="company-pending-invite-email" label="Pending invitation email" required
                      value={invitationEmail} disabled={invitationWorking||invitationLoading}
                      onChange={v=>{setInvitationEmail(v);setInvitationRequestId(crypto.randomUUID());setInvitationError("");}}
                      placeholder="invited@example.com"/>
                    <AppSelectField id="company-pending-invite-role" label="Role after verification" required
                      value={invitationRole} disabled={invitationWorking||invitationLoading}
                      onChange={v=>{setInvitationRole(v as CompanyMembershipRole);setInvitationRequestId(crypto.randomUUID());}}
                      options={[{value:"member",label:"Company member"},
                        {value:"tenant_admin",label:"Company Super Admin"}]}/>
                    <Button variant="secondary" size="sm" disabled={invitationWorking||invitationLoading
                      ||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitationEmail.trim())}
                      onClick={()=>setInvitationConfirmation({
                        action:"queue",tenantId:companyProfile.company.id,
                        email:invitationEmail.trim().toLowerCase(),
                        role:invitationRole,requestId:invitationRequestId})}>
                      Link pending invitation
                    </Button>
                  </div>
                  {invitationLoading&&<p role="status" style={note}>Checking pending company invitations…</p>}
                  {invitationError&&<p role="alert" style={{...note,color:"#b91c1c"}}>{invitationError}</p>}
                  {companyInvites?.length===0&&<p style={{...note,marginTop:10}}>No company invitation assignments yet.</p>}
                  {companyInvites?.map(invite=><div key={invite.user_id} style={{
                    borderTop:"1px solid var(--border-color,#dce1e8)",marginTop:10,paddingTop:10}}>
                    <p style={note}><strong>{invite.email}</strong> · {invite.membership_role==="tenant_admin"?"Company Super Admin":"Company member"} · {invite.status}</p>
                    {invite.status==="pending"&&<Button variant="tertiary" size="sm"
                      disabled={invitationWorking||invitationLoading}
                      onClick={()=>setInvitationConfirmation({
                        action:"cancel",tenantId:companyProfile.company.id,email:invite.email,
                        role:invite.membership_role,requestId:crypto.randomUUID()})}>
                      Cancel pending assignment
                    </Button>}
                  </div>)}
                </section>
                {companyProfile.members.length===0 && <p style={note}>No company memberships recorded.</p>}
                {companyProfile.members.map(member=><div key={member.user_id}
                  style={{borderTop:"1px solid var(--border-color,#dce1e8)",padding:"10px 0"}}>
                  <p style={note}><strong>{member.display_name}</strong> ·
                    {member.membership_role==="tenant_admin"?" Company Super Admin":" Company member"} · {member.membership_state}
                    <span style={{display:"block"}}>{member.email}</span>
                  </p>
                  {member.membership_state==="active" &&
                   !(member.membership_role==="tenant_admin" &&
                     companyProfile.members.filter(m=>m.membership_role==="tenant_admin"&&m.membership_state==="active").length<=1)
                   && <Button variant="tertiary" size="sm" disabled={companyWorking||companyLoading}
                    onClick={()=>setPendingMembership({action:"revoke",
                      tenantId:companyProfile.company.id,userId:member.user_id,
                      label:member.display_name,requestId:crypto.randomUUID()})}>
                    Revoke membership
                  </Button>}
                </div>)}
              </div>
              <div style={{...panel,padding:14}}>
                <h4 style={{fontWeight:650}}>Meeting templates ({companyProfile.templates.length})</h4>
                {companyProfile.templates.length===0 && <p style={note}>No company templates published or drafted.</p>}
                {companyProfile.templates.map(template=><p key={template.id} style={{...note,marginTop:8}}>
                  <strong>{template.title}</strong> · Draft v{template.current_revision} · Published {template.published_revision??"none"}
                </p>)}
              </div>
              <div style={{...panel,padding:14}}>
                <h4 style={{fontWeight:650}}>Immutable admin history ({companyProfile.events.length})</h4>
                {companyProfile.events.length===0 && <p style={note}>No administrative events recorded.</p>}
                {companyProfile.events.map(event=><p key={event.id} style={{...note,marginTop:8}}>
                  <strong>{event.action.replace(/_/g," ")}</strong> · {new Date(event.occurred_at).toLocaleString()}
                </p>)}
              </div>
            </div>
            <p role="status" style={{...note,marginTop:12}}>Subscription: not activated · Meetings: not activated · SQL/Storage/LiveKit isolation: not certified.</p>
          </section>
        )}
      </section>}

      {tab==="templates" && <MeetingTemplateMarketplace/>}

      {tab==="usage" && <section style={panel}>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}><Settings2 size={20}/><h2 style={{fontSize:19,fontWeight:650}}>Usage, add-ons and approval policies</h2></div>
        <p style={note}>Quoted seats, meeting time, recording, storage and LiveKit participant-minutes are contractual allowances. Hard/soft limits, trusted metering, approved meeting workflows, transcripts, AI summaries, document sign-off, renewals and refunds require separate secured event sources and policy checks.</p>
        <p role="status" style={{...note,marginTop:14}}>Trusted usage metering: {directory.usage_metering_activated?"Active":"Not activated"}. No synthetic usage is reported.</p>
        <p style={{...note,marginTop:12}}><ShieldCheck size={15} style={{display:"inline",marginRight:6}}/>Audit rows are immutable in SQL. Existing meeting and template behavior is preserved.</p>
      </section>}

      {pendingMembership && <SConfirmModal
        title={pendingMembership.action==="enroll"?"Assign company role?":"Revoke company membership?"}
        message={pendingMembership.action==="enroll"
          ? `Assign ${pendingMembership.email} as ${pendingMembership.role==="tenant_admin"?"Company Super Admin":"Company member"}? The account must already be verified and globally role-assigned; no subscription or meeting access is activated.`
          : `Revoke ${pendingMembership.label}'s company membership? Their tenant administrative access will be removed; this action is audited in SQL.`}
        confirmLabel={pendingMembership.action==="enroll"?"Assign account":"Revoke membership"}
        danger={pendingMembership.action==="revoke"}
        onClose={()=>{if(!companyWorking)setPendingMembership(null);}}
        onConfirm={()=>void saveCompanyMembership()}
      />}
      {invitationConfirmation && <SConfirmModal
        title={invitationConfirmation.action==="queue"?"Link pending invitation to company?":"Cancel pending company invitation?"}
        message={invitationConfirmation.action==="queue"
          ? `After ${invitationConfirmation.email} verifies their invitation and activates their Convay account, SQL will grant the selected company membership. No paid workspace or meeting access will activate.`
          : `Cancel the pending company membership for ${invitationConfirmation.email}? This will not cancel their independent Convay user invitation.`}
        confirmLabel={invitationConfirmation.action==="queue"?"Link invitation":"Cancel assignment"}
        danger={invitationConfirmation.action==="cancel"}
        onClose={()=>{if(!invitationWorking)setInvitationConfirmation(null);}}
        onConfirm={()=>void commitCompanyInvitation()}
      />}
      {confirmProvision && <SConfirmModal
        title="Create a provisioning company?"
        message={`Register "${companyName.trim()}" in the SQL company directory? This will not activate a subscription, meetings or workspace access.`}
        confirmLabel="Create provisioning record"
        onClose={()=>{if(!companyWorking)setConfirmProvision(false);}}
        onConfirm={()=>void provisionCompany()}
      />}
      {pending && <SConfirmModal
        title={pending.action==="void_quote"?"Void this quote?":"Confirm billing transition"}
        message={pending.action==="issue_quote"
          ?"Issue this quote using the saved SQL-calculated amount? The issued version cannot be edited."
          : pending.action==="void_quote"?"Void this quote? Its audit history will be retained."
          : pending.action==="create_invoice"?"Create a draft invoice from the issued quote? No payment will be collected."
          :"Issue this invoice? Payment remains uncollected until provider reconciliation is implemented."}
        confirmLabel={pending.action.replace(/_/g," ")}
        danger={pending.action==="void_quote"}
        onClose={()=>{if(!working)setPending(null);}}
        onConfirm={()=>void confirmAction()}
      />}
    </main>
  );
}
