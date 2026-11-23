import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Building2, CreditCard, FileText, Settings2, ShieldCheck, ArrowRight, Receipt, RefreshCw, Database, Layers } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/buttons/Button";
import { AppTextField } from "../../components/forms/AppTextField";
import { AppSelectField } from "../../components/forms/AppSelectField";
import { SConfirmModal } from "../../components/modals/SConfirmModal";
import {
  PRICE_METRICS, emptyQuoteForm, buildQuotePayload, estimateQuote, displayMoney,
  subscriptionAction, assertSavedQuote,
  type QuoteForm, type SavedQuote, type SavedInvoice, type SubscriptionDirectory,
} from "../../services/saas/subscriptionQuotes";

type Tab = "overview" | "pricing" | "billing" | "companies" | "templates" | "usage";
type PendingAction = { action: "issue_quote" | "void_quote" | "create_invoice" | "issue_invoice"; quote: SavedQuote; invoice?: SavedInvoice };
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
  const navigate = useNavigate();
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
          aria-pressed={tab===t.id} onClick={()=>setTab(t.id)}>{t.label}</Button>)}
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
              <p style={{...note,marginTop:16}}>Invoice payments, refunds and automated renewals are not enabled without a verified provider and financial reconciliation.</p>
            </>}
          </section>
        </div>
      </section>}

      {tab==="companies" && <section style={panel}>
        <h2 style={{fontSize:19,fontWeight:650,marginBottom:12}}>Company onboarding & 360° profiles</h2>
        <p style={note}>A company invitation, verified Company Super Admin, tenant-scoped members, subscriptions and meetings must be linked to the authoritative tenant record. Existing tenant-control SQL is present, but production tenant isolation has not been certified. No company workspace is activated by saving a quote.</p>
        <p role="status" style={{...note,marginTop:12}}>Tenant activation: {directory.tenant_isolation_certified?"Verified":"Not certified"} · Company provisioning actions are withheld until the complete SQL/Storage/LiveKit isolation gates pass.</p>
      </section>}

      {tab==="templates" && <section style={panel}>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}><Layers size={20}/><h2 style={{fontSize:19,fontWeight:650}}>Meeting templates & marketplace</h2></div>
        <p style={note}>Company-owned meeting types require versioned SQL definitions, configurable steps, field validation, approval rules and a wizard that binds each created meeting to its published template version. Existing meeting creation remains unchanged until those contracts pass full journey tests.</p>
        <Button variant="secondary" onClick={()=>navigate("/administration/meeting-configuration/meeting-types")}
          trailingIcon={ArrowRight}>View existing meeting types</Button>
      </section>}

      {tab==="usage" && <section style={panel}>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}><Settings2 size={20}/><h2 style={{fontSize:19,fontWeight:650}}>Usage, add-ons and approval policies</h2></div>
        <p style={note}>Quoted seats, meeting time, recording, storage and LiveKit participant-minutes are contractual allowances. Hard/soft limits, trusted metering, approved meeting workflows, transcripts, AI summaries, document sign-off, renewals and refunds require separate secured event sources and policy checks.</p>
        <p role="status" style={{...note,marginTop:14}}>Trusted usage metering: {directory.usage_metering_activated?"Active":"Not activated"}. No synthetic usage is reported.</p>
        <p style={{...note,marginTop:12}}><ShieldCheck size={15} style={{display:"inline",marginRight:6}}/>Audit rows are immutable in SQL. Existing meeting and template behavior is preserved.</p>
      </section>}

      {pending && <SConfirmModal
        title={pending.action==="void_quote"?"Void this quote?":"Confirm billing transition"}
        message={pending.action==="issue_quote"
          ?"Issue this quote using the saved SQL-calculated amount? The issued version cannot be edited."
          : pending.action==="void_quote"?"Void this quote? Its audit history will be retained."
          : pending.action==="create_invoice"?"Create a draft invoice from the issued quote? No payment will be collected."
          :"Issue this invoice? Payment remains uncollected until provider reconciliation is implemented."}
        confirmLabel={pending.action.replaceAll("_"," ")}
        danger={pending.action==="void_quote"}
        onClose={()=>{if(!working)setPending(null);}}
        onConfirm={()=>void confirmAction()}
      />}
    </main>
  );
}
