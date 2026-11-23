import { convayAuth } from "../supabase/convayAuth";

/** Platform-side proposals only. These records do not activate tenant access or charge money. */
export const PRICE_METRICS = [
  { key: "users", label: "User seats", unit: "seat" },
  { key: "meeting_minutes", label: "Meeting time", unit: "minute" },
  { key: "recording_minutes", label: "Recording time", unit: "minute" },
  { key: "storage_gb", label: "Storage", unit: "GB" },
  { key: "participant_minutes", label: "LiveKit participant time", unit: "participant-minute" },
] as const;

export type PriceMetric = (typeof PRICE_METRICS)[number]["key"];
export type BillingCurrency = "BDT" | "USD";
export type QuoteStatus = "draft" | "issued" | "void";
export type InvoiceStatus = "draft" | "issued" | "void";
export interface QuoteForm {
  organization_name: string;
  contact_email: string;
  currency: BillingCurrency;
  billing_cycle: "monthly" | "annually";
  quota_policy: "soft" | "hard";
  quantities: Record<PriceMetric, string>;
  rates: Record<PriceMetric, string>;
  base: string;
  discount: string;
  tax: string;
}

export interface QuoteBreakdown {
  lines: Array<{key:PriceMetric;quantity:number;rate_minor:number;total_minor:number}>;
  base_minor: number;
  subtotal_minor: number;
  discount_minor: number;
  tax_minor: number;
  total_minor: number;
}
export interface SavedQuote {
  id: string;
  organization_name: string;
  contact_email: string;
  currency: BillingCurrency;
  billing_cycle: QuoteForm["billing_cycle"];
  quota_policy: QuoteForm["quota_policy"];
  status: QuoteStatus;
  revision: number;
  quote_input: Record<string, unknown>;
  quote_breakdown: QuoteBreakdown;
  subtotal_minor: number;
  discount_minor: number;
  tax_minor: number;
  total_minor: number;
  created_at: string;
  issued_at: string | null;
}
export interface SavedInvoice {
  id: string;
  quote_id: string;
  status: InvoiceStatus;
  currency: BillingCurrency;
  total_minor: number;
  amount_paid_minor: number;
  created_at: string;
  issued_at: string | null;
}
export interface SubscriptionDirectory {
  quotes: SavedQuote[];
  invoices: SavedInvoice[];
  payment_provider_connected: boolean;
  usage_metering_activated: boolean;
  tenant_isolation_certified: boolean;
}

export const emptyQuoteForm: QuoteForm = {
  organization_name: "", contact_email: "", currency: "BDT", billing_cycle: "monthly",
  quota_policy: "soft", base: "0.00", discount: "0", tax: "0",
  quantities: { users: "0", meeting_minutes: "0", recording_minutes: "0", storage_gb: "0", participant_minutes: "0" },
  rates: { users: "0.00", meeting_minutes: "0.00", recording_minutes: "0.00",
           storage_gb: "0.00", participant_minutes: "0.00" },
};

export function parseMoneyMinor(value: string): number {
  if (!/^[0-9]{1,8}(?:\.[0-9]{1,2})?$/.test(value.trim())) throw new Error("Enter a valid price with up to two decimals");
  const [whole, decimal = ""] = value.trim().split(".");
  const minor = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor) || minor > 1000000000) throw new Error("Price exceeds allowed limit");
  return minor;
}
export function parsePercentBps(value: string): number {
  if (!/^[0-9]{1,3}(?:\.[0-9]{1,2})?$/.test(value.trim())) throw new Error("Enter a percentage between 0 and 100");
  const [whole, fractional=""] = value.trim().split(".");
  const bps = Number(whole) * 100 + Number(fractional.padEnd(2, "0"));
  if (bps > 10000) throw new Error("Percentage cannot exceed 100");
  return bps;
}
export function buildQuotePayload(form: QuoteForm, requestId: string) {
  const name = form.organization_name.trim();
  const email = form.contact_email.trim().toLowerCase();
  if (name.length < 3 || name.length > 160) throw new Error("Company name must be 3–160 characters");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Enter a valid contact email");
  const quantities = {} as Record<PriceMetric, number>;
  const rates_minor = {} as Record<PriceMetric, number>;
  for (const metric of PRICE_METRICS) {
    const raw = form.quantities[metric.key].trim();
    if (!/^[0-9]{1,7}$/.test(raw) || Number(raw) > 1000000) throw new Error("Invalid quantity for " + metric.label);
    quantities[metric.key] = Number(raw);
    rates_minor[metric.key] = parseMoneyMinor(form.rates[metric.key]);
    if (rates_minor[metric.key] > 100000000) throw new Error("Rate exceeds permitted limit for " + metric.label);
  }
  return {
    request_id: requestId, organization_name: name, contact_email: email,
    billing_cycle: form.billing_cycle, currency: form.currency, quota_policy: form.quota_policy,
    quantities, rates_minor, base_minor: parseMoneyMinor(form.base),
    discount_bps: parsePercentBps(form.discount), tax_bps: parsePercentBps(form.tax),
  };
}
export function estimateQuote(payload: ReturnType<typeof buildQuotePayload>): QuoteBreakdown {
  const lines = PRICE_METRICS.map(m => ({
    key:m.key,quantity:payload.quantities[m.key],rate_minor:payload.rates_minor[m.key],
    total_minor:payload.quantities[m.key] * payload.rates_minor[m.key],
  }));
  const subtotal_minor = payload.base_minor + lines.reduce((sum,l)=>sum+l.total_minor,0);
  const discount_minor = Math.round(subtotal_minor * payload.discount_bps / 10000);
  const tax_minor = Math.round((subtotal_minor-discount_minor) * payload.tax_bps / 10000);
  const total_minor = subtotal_minor-discount_minor+tax_minor;
  if (![subtotal_minor,discount_minor,tax_minor,total_minor].every(Number.isSafeInteger)) throw new Error("Price exceeds safe range");
  return { lines, base_minor:payload.base_minor, subtotal_minor, discount_minor, tax_minor, total_minor };
}
export function displayMoney(minor: number, currency: BillingCurrency) {
  return new Intl.NumberFormat("en-US",{style:"currency",currency,maximumFractionDigits:2}).format(minor/100);
}
export async function subscriptionAction<T>(action:string,payload:Record<string,unknown>={}):Promise<T> {
  const res = await convayAuth.authenticatedRequest("/rest/v1/rpc/convay_subscription_manage",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({p_action:action,p_payload:payload}),
  });
  const response = await res.json() as T;
  if (!response || typeof response !== "object") throw new Error("Invalid subscription SQL response");
  return response;
}
export function assertSavedQuote(
  result: {quote?:SavedQuote},
  expected:ReturnType<typeof buildQuotePayload>,
  list:SubscriptionDirectory,
): SavedQuote {
  const quote=result.quote;
  if (!quote?.id || quote.status!=="draft" || quote.contact_email!==expected.contact_email
      || quote.organization_name!==expected.organization_name
      || quote.currency!==expected.currency || quote.billing_cycle!==expected.billing_cycle
      || quote.quota_policy!==expected.quota_policy) throw new Error("SQL did not confirm the proposed quote");
  const estimated = estimateQuote(expected);
  if (quote.total_minor!==estimated.total_minor
      || !list.quotes.some(q=>q.id===quote.id && q.total_minor===estimated.total_minor)) {
    throw new Error("Saved quote does not match SQL readback; refresh before retrying");
  }
  return quote;
}

/** Only immutable database events count as verified billing administration history. */
export type SubscriptionAuditEvent = {
  id: number; quote_id: string; invoice_id: string | null; actor_id: string;
  operation: string; details: Record<string, unknown>; created_at: string;
};
export type SubscriptionAuditReadback = {
  quote_id: string; quote_revision: number; events: SubscriptionAuditEvent[];
};
export function assertSubscriptionAuditReadback(
  payload: SubscriptionAuditReadback, quoteId: string, revision: number,
): SubscriptionAuditEvent[] {
  if (!payload || payload.quote_id !== quoteId || payload.quote_revision !== revision
    || !Array.isArray(payload.events)) {
    throw new Error("SQL audit readback did not match this quote. Refresh before retrying.");
  }
  let previousId = Number.POSITIVE_INFINITY;
  for (const event of payload.events) {
    if (!Number.isSafeInteger(event.id) || event.id <= 0 || event.id >= previousId
      || event.quote_id !== quoteId || !event.operation || !event.created_at) {
      throw new Error("SQL returned an invalid billing audit event.");
    }
    previousId = event.id;
  }
  return payload.events;
}

export async function subscriptionAuditRead(quoteId: string): Promise<SubscriptionAuditReadback> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quoteId)) {
    throw new Error("Invalid subscription quote identifier");
  }
  const response = await convayAuth.authenticatedRequest("/rest/v1/rpc/convay_subscription_audit_read", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_quote_id: quoteId }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(typeof data?.message === "string" ? data.message : "Unable to verify billing history in SQL");
  }
  return data as SubscriptionAuditReadback;
}
