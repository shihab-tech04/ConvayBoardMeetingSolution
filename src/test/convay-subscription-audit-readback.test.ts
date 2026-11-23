import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertSubscriptionAuditReadback } from "../app/services/saas/subscriptionQuotes";

const quote = "11111111-1111-4111-8111-111111111111";
const event = (id: number, quoteId = quote) => ({
  id,quote_id:quoteId,invoice_id:null,actor_id:"33333333-3333-4333-8333-333333333333",
  operation:"quote_created",details:{},created_at:"2026-11-23T12:00:00Z",
});
const sql = readFileSync(resolve(process.cwd(),"supabase/migrations/20261123193000_convay_subscription_audit_readback.sql"),"utf8");

describe("Subscription SQL audit readback and recovery",()=>{
  it("accepts only exact quote and revision readback with ordered immutable events",()=>{
    expect(assertSubscriptionAuditReadback({quote_id:quote,quote_revision:2,events:[event(8),event(3)]},quote,2)).toHaveLength(2);
    expect(()=>assertSubscriptionAuditReadback({quote_id:quote,quote_revision:1,events:[]},quote,2)).toThrow();
    expect(()=>assertSubscriptionAuditReadback({quote_id:"other",quote_revision:2,events:[]},quote,2)).toThrow();
  });
  it("rejects forged cross-quote events, duplicate IDs and malformed records",()=>{
    for(const events of [[event(5,"another")],[event(5),event(5)],[event(2),event(3)],[event(-1)]]) {
      expect(()=>assertSubscriptionAuditReadback({quote_id:quote,quote_revision:1,events},quote,1)).toThrow();
    }
  });
  it("requires authenticated platform Super Admin, private table and explicit read-only action",()=>{
    expect(sql).toContain("account_role='super_admin'");
    expect(sql).toContain("account_status='active'");
    expect(sql).toContain("auth.uid()");
    expect(sql).toContain("convay_private.subscription_audit");
    expect(sql).toContain("where a.quote_id=p_quote_id");
    expect(sql).toContain("revoke all on function public.convay_subscription_audit_read(uuid) from public,anon,authenticated");
    expect(sql).toContain("grant execute on function public.convay_subscription_audit_read(uuid) to authenticated");
    expect(sql).not.toMatch(/\b(insert|update|delete)\s+into\s+convay_private\./i);
  });
});
