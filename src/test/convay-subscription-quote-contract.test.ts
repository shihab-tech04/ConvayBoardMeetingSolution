import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  emptyQuoteForm, buildQuotePayload, estimateQuote, parseMoneyMinor,
  parsePercentBps, assertSavedQuote,
} from "../app/services/saas/subscriptionQuotes";

const request = "11111111-1111-4111-8111-111111111111";
const valid = () => ({
  ...emptyQuoteForm,
  organization_name: "Example Board Company",
  contact_email: "admin@example.org",
  quantities: {...emptyQuoteForm.quantities,users:"20",meeting_minutes:"120"},
  rates:{...emptyQuoteForm.rates,users:"300.00",meeting_minutes:"2.00"},
  base:"1000.00",discount:"10",tax:"15",
});
const sql = readFileSync(resolve(process.cwd(), "supabase/sql/convay_subscription_quote_control_plane.sql"),"utf8");

describe("root-managed SaaS subscription quote contract", () => {
  it("requires company email and valid negotiated amounts", () => {
    expect(()=>buildQuotePayload(valid(),request)).not.toThrow();
    expect(()=>buildQuotePayload({...valid(),contact_email:"bad"},request)).toThrow();
    expect(()=>buildQuotePayload({...valid(),organization_name:"X"},request)).toThrow();
    expect(()=>parseMoneyMinor("0.001")).toThrow();
    expect(()=>parsePercentBps("101")).toThrow();
  });
  it("uses integer minor units and tax after discount", () => {
    const form=valid();
    const payload=buildQuotePayload(form,request);
    const quote=estimateQuote(payload);
    expect(payload.rates_minor.users).toBe(30000);
    expect(quote.subtotal_minor).toBe(724000);
    expect(quote.discount_minor).toBe(72400);
    expect(quote.tax_minor).toBe(97740);
    expect(quote.total_minor).toBe(749340);
  });
  it("rejects unsafe client prices and excessive quantities", () => {
    expect(()=>buildQuotePayload({...valid(),quantities:{...valid().quantities,users:"1000001"}},request)).toThrow();
    expect(()=>buildQuotePayload({...valid(),rates:{...valid().rates,users:"1000001.00"}},request)).toThrow();
  });
  it("requires SQL list readback before claiming a quote saved", () => {
    const payload=buildQuotePayload(valid(),request);
    const quote={
      id:"22222222-2222-4222-8222-222222222222",contact_email:payload.contact_email,
      organization_name:payload.organization_name,status:"draft" as const,
      currency:payload.currency,billing_cycle:payload.billing_cycle,
      quota_policy:payload.quota_policy,total_minor:estimateQuote(payload).total_minor,
    };
    const records={quotes:[quote],invoices:[],payment_provider_connected:false,
      usage_metering_activated:false,tenant_isolation_certified:false};
    expect(()=>assertSavedQuote({quote:quote as never},payload,records as never)).not.toThrow();
    expect(()=>assertSavedQuote({quote:quote as never},payload,{...records,quotes:[]} as never)).toThrow();
    expect(()=>assertSavedQuote({quote:{...quote,total_minor:999} as never},payload,records as never)).toThrow();
  });
  it("protects private finance tables with RLS, no browser privileges and immutable audit", () => {
    for(const table of ["subscription_quotes","subscription_invoices","subscription_audit"]){
      expect(sql).toContain("alter table convay_private."+table+" enable row level security;");
      expect(sql).toContain("revoke all on convay_private."+table+" from public,anon,authenticated;");
    }
    expect(sql).toContain("prevent_subscription_audit_mutation");
    expect(sql).toContain("account_role='super_admin'");
    expect(sql).toContain("auth.uid()");
    expect(sql).toContain("Quote changed. Reload before retrying");
    expect(sql).toContain("grant execute on function public.convay_subscription_manage(text,jsonb)");
    expect(sql).not.toContain("grant select on convay_private.subscription_quotes to authenticated");
  });
  it("never forges payments or tenant activation",()=>{
    expect(sql).toContain("amount_paid_minor bigint not null default 0 check (amount_paid_minor = 0)");
    expect(sql).toContain("'tenant_isolation_certified',false");
    expect(sql).toContain("'payment_provider_connected',false");
    expect(sql).not.toMatch(/p_action='capture_payment'/);
  });
});
