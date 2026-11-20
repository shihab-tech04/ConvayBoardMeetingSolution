import { describe, expect, it } from "vitest";
import {
  shouldHydratePermissionDraft, mayDismissPermissionDraft,
} from "../app/components/permissions/permissionDraftLifecycle";

describe("AC-05 permission editor draft lifecycle", () => {
  const state = {
    open: true, identity: "edit:perm-id", hydratedIdentity: null,
    groupsReady: true, saving: false,
  };
  it("hydrates a loaded editor once, not on refreshed permission objects", () => {
    expect(shouldHydratePermissionDraft(state)).toBe(true);
    expect(shouldHydratePermissionDraft({...state, hydratedIdentity: "edit:perm-id"})).toBe(false);
  });
  it("keeps unsaved values when group or permission snapshots refresh", () => {
    expect(shouldHydratePermissionDraft({...state, hydratedIdentity: "edit:perm-id", groupsReady: true})).toBe(false);
  });
  it("does not initialize an empty group before its authoritative catalogue loads", () => {
    expect(shouldHydratePermissionDraft({...state, groupsReady: false})).toBe(false);
    expect(shouldHydratePermissionDraft(state)).toBe(true);
  });
  it("initializes a different selected record but does not reset the current one", () => {
    expect(shouldHydratePermissionDraft({...state, hydratedIdentity:"edit:another"})).toBe(true);
    expect(shouldHydratePermissionDraft({...state, hydratedIdentity:"edit:perm-id"})).toBe(false);
  });
  it("resets create-draft identity only on a new opened session", () => {
    expect(shouldHydratePermissionDraft({...state, identity:"create", hydratedIdentity:null})).toBe(true);
    expect(shouldHydratePermissionDraft({...state, identity:"create", hydratedIdentity:"create"})).toBe(false);
    expect(shouldHydratePermissionDraft({...state, identity:"create", hydratedIdentity:null, open:false})).toBe(false);
  });
  it("rejects reinitialization and Escape/Cancel/backdrop dismissal while saving", () => {
    expect(shouldHydratePermissionDraft({...state, saving:true})).toBe(false);
    expect(mayDismissPermissionDraft(true)).toBe(false);
    expect(mayDismissPermissionDraft(false)).toBe(true);
  });
});
