import { describe, expect, it } from "vitest";
import {
  permissionForAction, actionGranted, filterActionsByAccess,
  withResolverAliases,
} from "../app/services/supabase/actionPermissions";
import { PERM_GROUPS } from "../app/data/permissions";
import type { EntityType, ResolvedAction } from "../app/actions/types";

const cases: [EntityType, string, string][] = [
  ["meeting","edit","mtg_update"],
  ["meeting","continue_setup","mtg_update"],
  ["meeting","approve","mtg_approve"],
  ["meeting","cancel","mtg_cancel"],
  ["agenda_item","approve","agd_approve"],
  ["document","download_document","doc_download"],
  ["document","publish","doc_publish"],
  ["board_pack","publish","pack_publish"],
  ["decision","approve","dec_approve"],
  ["resolution","approve","res_approve"],
  ["action_item","mark_complete","act_close"],
  ["minutes","approve","min_approve"],
  ["governance_body","manage_members","gov_body_manage"],
  ["user","assign_role","admin_users_reassign"],
  ["workflow","activate_workflow","admin_workflows"],
];
describe("Convay action permissions", () => {
  it("uses codes that exist in the 75-entry SQL catalog", () => {
    const ids = new Set(PERM_GROUPS.flatMap(g => g.permissions.map(p => p.id)));
    for (const [entity, action, permission] of cases) {
      expect(permissionForAction(entity, action)).toBe(permission);
      expect(ids.has(permission)).toBe(true);
    }
  });
  it("does not allow a viewer to perform an unrelated write action", () => {
    expect(actionGranted("meeting", "edit", ["mtg_view"], false)).toBe(false);
    expect(actionGranted("meeting", "continue_setup", ["mtg_view"], false)).toBe(false);
    expect(actionGranted("meeting", "edit", ["mtg_update"], false)).toBe(true);
    expect(actionGranted("meeting", "continue_setup", ["mtg_update"], false)).toBe(true);
    expect(actionGranted("document", "publish", ["doc_view"], false)).toBe(false);
  });
  it("denies unknown non-admin action IDs", () => {
    expect(actionGranted("meeting", "unmapped_legacy_delete", ["mtg_view"], false)).toBe(false);
  });
  it("never promotes legacy aliases into real authorization grants", () => {
    const grants = ["agd_view", "agd_approve"];
    expect(withResolverAliases(grants)).toContain("agenda_approve");
    expect(actionGranted("agenda_item", "approve", ["agd_view"], false)).toBe(false);
    expect(actionGranted("agenda_item", "approve", ["agd_approve"], false)).toBe(true);
  });
  it("removes unauthorized actions while keeping allowed action state", () => {
    const action=(id:string):ResolvedAction => ({
      id,label:id,icon:(()=>null) as any,tone:"neutral",placement:"direct",
      priority:1,visible:true,enabled:true,
    });
    const filtered=filterActionsByAccess("meeting",[action("view"),action("edit")],["mtg_view"],false);
    expect(filtered.map(x=>x.id)).toEqual(["view"]);
    expect(filtered[0].enabled).toBe(true);
  });
});
