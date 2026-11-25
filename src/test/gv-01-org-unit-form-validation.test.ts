import { describe, expect, it } from "vitest";
import type { OrgUnit } from "../app/data/boardMeetingData";
import type { BmsUser } from "../app/data/bmsUsers";
import { firstInvalidOrgUnitStep, validateOrgUnitFormStep, type UnitFormValues } from "../app/pages/governance/orgUnitFormValidation";

const unit = (id: string, type: string, status = "Active", parent?: string, code?: string): OrgUnit =>
  ({ id, unit_id: id, unit_type: type, unit_name: id, status, code, parent_unit_id: parent,
     parent_unit: "", head: "", member_count: "0", created_at: "2026-11-23T00:00:00Z" }) as OrgUnit;
const user = (id: string, status = "active"): BmsUser =>
  ({ id, account_status: status, name: id }) as BmsUser;
const units = [
  unit("org", "Organization", "Active", undefined, "ORG"),
  unit("hq", "Head Office", "Active", "org", "HQ"),
  unit("draft", "Head Office", "Draft", "org"),
  unit("div", "Division", "Active", "hq"),
];
const users = [user("head"), user("pending", "pending_activation"), user("deputy")];
const form = (patch: Partial<UnitFormValues> = {}): UnitFormValues => ({
  unit_type: "Department", unit_name: "Finance", code: "FIN", description: "",
  phone: "", email: "", address: "", parent_unit_id: "div",
  effective_start_at: "", head_user_id: "", deputy_user_id: "",
  status: "Active", ...patch,
});

describe("GV-01 organization unit wizard validation", () => {
  it("allows the first root organization without a parent", () => {
    expect(firstInvalidOrgUnitStep(form({ unit_type: "Organization", parent_unit_id: "" }), units, users)).toBeNull();
  });
  it("blocks unsupported types, missing names and duplicate codes", () => {
    expect(firstInvalidOrgUnitStep(form({ unit_type: "Other" }), units, users)?.step).toBe(0);
    expect(firstInvalidOrgUnitStep(form({ unit_name: " " }), units, users)?.errors.unit_name).toBeTruthy();
    expect(firstInvalidOrgUnitStep(form({ code: " hq " }), units, users)?.errors.code).toMatch(/already/);
  });
  it("validates optional phone, email and date", () => {
    expect(validateOrgUnitFormStep(1, form({ phone: "not-a-phone" }), units, users).phone).toBeTruthy();
    expect(validateOrgUnitFormStep(1, form({ email: "invalid" }), units, users).email).toBeTruthy();
    expect(validateOrgUnitFormStep(2, form({ effective_start_at: "2026-02-30" }), units, users).effective_start_at).toBeTruthy();
  });
  it("rejects absent, missing, wrong-type, and inactive parents", () => {
    expect(validateOrgUnitFormStep(2, form({ parent_unit_id: "" }), units, users).parent_unit_id).toBeTruthy();
    expect(validateOrgUnitFormStep(2, form({ parent_unit_id: "gone" }), units, users).parent_unit_id).toBeTruthy();
    expect(validateOrgUnitFormStep(2, form({ parent_unit_id: "hq" }), units, users).parent_unit_id).toBeTruthy();
    expect(validateOrgUnitFormStep(2, form({ parent_unit_id: "bad" }), [...units, unit("bad", "Division", "Archived")], users).parent_unit_id).toBeTruthy();
  });
  it("requires an Active parent before activating the child", () => {
    const v = form({ unit_type: "Division", parent_unit_id: "draft" });
    expect(validateOrgUnitFormStep(2, v, units, users, undefined, "Active").parent_unit_id).toMatch(/Activate/);
    expect(validateOrgUnitFormStep(2, v, units, users, undefined, "Draft").parent_unit_id).toBeUndefined();
  });
  it("requires active, distinct leaders", () => {
    expect(validateOrgUnitFormStep(3, form({ head_user_id: "pending" }), units, users).head_user_id).toBeTruthy();
    expect(validateOrgUnitFormStep(3, form({ head_user_id: "head", deputy_user_id: "head" }), units, users).deputy_user_id).toBeTruthy();
    expect(validateOrgUnitFormStep(3, form({ head_user_id: "head", deputy_user_id: "deputy" }), units, users)).toEqual({});
  });
  it("uses Move Unit rather than unsafe edit-time hierarchy mutation", () => {
    expect(validateOrgUnitFormStep(2, form({ unit_type: "Head Office", parent_unit_id: "hq" }), units, users, units[1]).parent_unit_id).toBeTruthy();
    expect(validateOrgUnitFormStep(0, form({ unit_type: "Department" }), units, users, units[1]).unit_type).toBeTruthy();
  });
  it("rechecks previous steps when saving from Review", () => {
    expect(firstInvalidOrgUnitStep(form({ unit_name: "" }), units, users)?.step).toBe(1);
    expect(firstInvalidOrgUnitStep(form({ parent_unit_id: "hq" }), units, users)?.step).toBe(2);
    expect(firstInvalidOrgUnitStep(form({ head_user_id: "pending" }), units, users)?.step).toBe(3);
    expect(firstInvalidOrgUnitStep(form({ head_user_id: "head", deputy_user_id: "deputy" }), units, users)).toBeNull();
  });
});
