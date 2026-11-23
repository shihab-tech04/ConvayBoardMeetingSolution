import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const file = new URL("../app/pages/governance/OrganizationStructurePage.tsx", import.meta.url);
const source = readFileSync(file, "utf8");
const wizard = source.slice(
  source.indexOf("function UnitFormModal("),
  source.indexOf("// ── Filter panel"),
);

describe("GV-01 approved UI parity with shared Convay page/form components", () => {
  it("uses the existing full-page AppModal and its five-step wizard, not a private overlay", () => {
    expect(wizard).toContain("<AppModal");
    expect(wizard).toContain("fullPage");
    expect(wizard).toContain("steps={FORM_STEPS}");
    expect(wizard).toContain("currentStep={step}");
    expect(wizard).not.toContain("return createPortal(");
    expect(source).toContain('const FORM_STEPS = ["Unit Type", "Basic Info", "Parent & Path", "Leadership", "Review"]');
  });

  it("uses existing form section cards and the approved responsive two-column grid", () => {
    expect((wizard.match(/<section className="form-section"/g) ?? []).length).toBe(5);
    expect(wizard).toContain('className="form-section__body--grid"');
    expect(wizard).toContain('className="form-section__body--stack"');
    expect(wizard).toContain('className="field-group--full"');
    expect(wizard).not.toContain('label="Unit Name" required compact');
    expect(wizard).not.toContain('label="Short Code" compact');
  });

  it("preserves all prior field inputs and full validation/save options", () => {
    for (const field of ["unit_name", "code", "desc", "phone", "email", "address", "parent", "head", "deputy"]) {
      expect(wizard).toContain(`id="${field}"`);
    }
    expect(wizard).toContain("firstInvalidOrgUnitStep(");
    expect(wizard).toContain('handleSubmit("Draft")');
    expect(wizard).toContain('handleSubmit("Active")');
    expect(wizard).toContain("requestClose");
    expect(wizard).toContain("onStepClick=");
  });

  it("reuses approved StatCard and button components on the page without changing the counters", () => {
    expect(source).toContain("<StatCard");
    for (const label of ["Total Units", "Active", "Branches", "Divisions", "Departments"])
      expect(source).toContain(`label="${label}"`);
    expect(source).toContain("<PrimaryButton type=\"button\" onClick={() => openCreate()}");
  });
});
