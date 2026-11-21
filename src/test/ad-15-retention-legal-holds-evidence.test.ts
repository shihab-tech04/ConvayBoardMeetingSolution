import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LEGAL_HOLD_FORM_FIELDS, RETENTION_FORM_FIELDS } from "../app/pages/boardMeetingFormFields";
import { unverifiedRetentionLegalHoldsView } from "../app/pages/administration/retentionLegalHoldsEvidence";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const pageSource = read("src/app/pages/administration/RetentionLegalHoldsPage.tsx");
const routesSource = read("src/app/routes.tsx");
const accessSource = read("src/app/services/supabase/convayAccess.ts");
const tableSource = read("src/app/components/pages/GeneratedTablePage.tsx");

describe("AD-15 retention and legal-hold evidence state", () => {
  it("keeps unsupported registry data empty and states the required safety rules", () => {
    const evidence = unverifiedRetentionLegalHoldsView();

    expect(evidence.rows).toEqual([]);
    expect(evidence.unavailableReason).toContain("tenant-scoped");
    expect(evidence.unavailableReason).toContain("Legal holds blocking purge");
    expect(evidence.unavailableReason).toContain("missing policies defaulting to retain");
    expect(evidence.unavailableReason).toContain("permitted-role and wrong-tenant denial");
    expect(evidence.unavailableReason).toContain("original resource/version/references/access unchanged");
    expect(evidence.unavailableReason).toContain("stable-ID save retry and reopen after interruption");
    expect(evidence.unavailableReason).toContain("audit readback");
    expect(evidence.unavailableReason).toContain("No sample records or counts are shown");
    expect(evidence.unavailableReason).toContain("policy and legal-hold writes are disabled");
  });

  it("provides the retention and legal-hold fields without wiring unsupported writes", () => {
    expect(pageSource).toContain("Required safety rules: legal holds block purge, and missing policy retains records.");
    expect(RETENTION_FORM_FIELDS.map(field => field.key)).toEqual([
      "policy_name", "entity_type", "retention_period", "disposal_method", "legal_basis", "effective_date", "status",
    ]);
    expect(LEGAL_HOLD_FORM_FIELDS.map(field => field.key)).toContain("hold_title");
    expect(LEGAL_HOLD_FORM_FIELDS.map(field => field.key)).toContain("record_scope");
    expect(LEGAL_HOLD_FORM_FIELDS.map(field => field.key)).toContain("reason");
    expect(pageSource).toContain("formFields: RETENTION_FORM_FIELDS");
    expect(pageSource).toContain("formFields: LEGAL_HOLD_FORM_FIELDS");
    expect(pageSource).toContain("RETENTION_RULE_DRAWER_COLS");
    expect(pageSource).toContain("mobileCardMapping:");
    expect(pageSource).toContain("rows: evidence.rows");
    expect(pageSource).toContain("dataError: evidence.unavailableReason");
    expect(pageSource).not.toContain("onRowCreate");
    expect(pageSource).not.toContain("onRowUpdate");
    expect(pageSource).not.toContain("useExtensionRequestRegistry");
  });

  it("routes the official screen to the evidence-gated page and preserves the legacy route", () => {
    expect(routesSource).toContain('{ path: "administration/security-retention/retention-legal-holds",  Component: RetentionLegalHoldsPage }');
    expect(routesSource).toContain('{ path: "administration/time-extension",      Component: TimeExtensionPage }');
    expect(accessSource).toContain('"administration/security-retention/retention-legal-holds": "admin_retention"');
    expect(accessSource).toContain('"administration/time-extension": "admin_retention"');
  });

  it("disables both standard and extra create actions when registry data is unavailable", () => {
    expect(tableSource.match(/disabled=\{Boolean\(cfg\.dataLoading \|\| cfg\.dataError\)\}/g)).toHaveLength(2);
  });
});
