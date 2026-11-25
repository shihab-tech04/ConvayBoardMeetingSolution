import { describe, expect, it } from "vitest";
import { shouldHydrateRoleDraft } from "../app/components/roles/roleDraftHydration";

describe("AC-01 editor draft lifecycle", () => {
  it("hydrates a new role exactly once until the modal closes", () => {
    expect(shouldHydrateRoleDraft({open:true,roleId:null,roleExists:false,hydratedKey:null})).toBe(true);
    expect(shouldHydrateRoleDraft({open:true,roleId:null,roleExists:false,hydratedKey:"__new__"})).toBe(false);
  });
  it("keeps edited values while access/role snapshots refresh", () => {
    expect(shouldHydrateRoleDraft({open:true,roleId:"r1",roleExists:true,hydratedKey:"r1"})).toBe(false);
  });
  it("waits for delayed authoritative role data before hydrating", () => {
    expect(shouldHydrateRoleDraft({open:true,roleId:"r1",roleExists:false,hydratedKey:null})).toBe(false);
    expect(shouldHydrateRoleDraft({open:true,roleId:"r1",roleExists:true,hydratedKey:null})).toBe(true);
  });
  it("hydrates when changing to a distinct role while open", () => {
    expect(shouldHydrateRoleDraft({open:true,roleId:"r2",roleExists:true,hydratedKey:"r1"})).toBe(true);
  });
  it("never hydrates while closed", () => {
    expect(shouldHydrateRoleDraft({open:false,roleId:"r1",roleExists:true,hydratedKey:null})).toBe(false);
  });
});
