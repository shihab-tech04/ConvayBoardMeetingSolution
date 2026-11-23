import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { unverifiedSecurityPoliciesView } from "../app/pages/administration/securityPoliciesEvidence";

const pageSource = readFileSync(
  resolve(process.cwd(), "src/app/pages/administration/SecurityPoliciesPage.tsx"),
  "utf8",
);
const routesSource = readFileSync(resolve(process.cwd(), "src/app/routes.tsx"), "utf8");
const drawerSource = readFileSync(resolve(process.cwd(), "src/app/pages/boardMeetingDrawerSchemas.ts"), "utf8");

describe("AD-14 security policy evidence state", () => {
  it("does not present fabricated policy records or derived counts", () => {
    const evidence = unverifiedSecurityPoliciesView();

    expect(evidence.rows).toEqual([]);
    expect(evidence.unavailableReason).toContain("No sample policies or counts are shown");
    expect(pageSource).not.toContain("useAuditEventRegistry");
    expect(pageSource).not.toContain("buildPageKpis");
    expect(pageSource).not.toContain("onRowCreate");
  });

  it("keeps root protection, isolation, versioning, retry, and audit requirements explicitly unverified", () => {
    const { unavailableReason } = unverifiedSecurityPoliciesView();

    expect(unavailableReason).toContain("tenant-scoped");
    expect(unavailableReason).toContain("Authorized Super Admin access");
    expect(unavailableReason).toContain("policy version and impact history");
    expect(unavailableReason).toContain("non-bypassable root protection");
    expect(unavailableReason).toContain("denial of attempts to disable it");
    expect(unavailableReason).toContain("wrong-tenant/unprivileged denial");
    expect(unavailableReason).toContain("original resource/version/references/access unchanged");
    expect(unavailableReason).toContain("stable-ID save retry/reopen after interruption");
    expect(unavailableReason).toContain("audit readback");
    expect(unavailableReason).toContain("policy creation and edits are disabled");
  });

  it("keeps the policy route, table, form, drawer, filters, and mobile view separate from Audit Trail", () => {
    expect(routesSource).toContain('{ path: "administration/security-retention/security-policies",      Component: SecurityPoliciesPage }');
    expect(routesSource).toContain('{ path: "administration/audit-selection",     loader: async () => redirect("/archive-reports/audit-trail") }');
    expect(routesSource).not.toContain('Component: AuditSelectionPage');
    expect(pageSource).toContain('title: "Security Policies"');
    expect(pageSource).toContain('titleKey: "navigation.administration.securityPolicies"');
    expect(pageSource).toContain('fc("policy_name", "Policy Name")');
    expect(pageSource).toContain('fc("policy_type", "Policy Type")');
    expect(pageSource).toContain('fc("applies_to", "Applies To")');
    expect(pageSource).toContain('fc("review_date", "Last Reviewed")');
    expect(pageSource).toContain('fc("policy_owner", "Policy Owner")');
    expect(pageSource).toContain('BADGE("status", "Status")');
    expect(pageSource).toContain("filters,");
    expect(pageSource).toContain("mobileCardMapping:");
    expect(pageSource).toContain("formFields: SECURITY_POLICY_FORM_FIELDS");
    expect(pageSource).toContain('entryBtn: "Add Security Policy"');
    expect(drawerSource).toContain('{ key: "impact_history", label: "Impact History" }');
    expect(drawerSource).toContain('{ key: "version",     label: "Policy Version" }');
  });

  it("uses the shared unavailable state to hide false data and disable unsupported writes", () => {
    expect(pageSource).toContain("rows: evidence.rows");
    expect(pageSource).toContain("dataError: evidence.unavailableReason");
    expect(pageSource).toContain('dataErrorTitle: "Security policies are unavailable"');
    expect(pageSource).toContain("dataErrorDescription: evidence.unavailableReason");

    const tableSource = readFileSync(
      resolve(process.cwd(), "src/app/components/pages/GeneratedTablePage.tsx"),
      "utf8",
    );
    expect(tableSource).toContain("disabled={Boolean(cfg.dataLoading || cfg.dataError)}");
  });
});
