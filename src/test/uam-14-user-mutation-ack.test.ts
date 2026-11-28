import { describe, expect, it } from "vitest";
import { requireUserMutationAck } from "../app/pages/administration-requests/userMutationAck";

const id = "33333333-3333-4333-8333-333333333333";
const other = "44444444-4444-4444-8444-444444444444";
const user = {
  user_id: id, display_name: "Test Member", email: "test@example.com",
  account_status: "inactive", invitation_status: "pending",
};
const notConfirmed = /Server did not confirm.*Reload users before retrying/;

describe("WS-F UAM-14 user mutation server ACK truthfulness", () => {
  it("accepts an actual pending invitation only for the correct email", () => {
    expect(() => requireUserMutationAck("invite", { user }, { email: " TEST@EXAMPLE.COM " }))
      .not.toThrow();
  });
  it("denies an invite acknowledged with the wrong email", () => {
    expect(() => requireUserMutationAck("invite", { user }, { email: "other@example.com" }))
      .toThrow(notConfirmed);
  });
  it("denies an invite incorrectly presented as active or accepted", () => {
    expect(() => requireUserMutationAck("invite", {
      user: { ...user, account_status: "active" },
    }, { email: user.email })).toThrow(notConfirmed);
    expect(() => requireUserMutationAck("invite", {
      user: { ...user, invitation_status: "accepted" },
    }, { email: user.email })).toThrow(notConfirmed);
  });
  it("denies an edit ACK for the wrong account or unexpected name", () => {
    expect(() => requireUserMutationAck("update", {
      user: { ...user, user_id: other },
    }, { userId: id, displayName: user.display_name })).toThrow(notConfirmed);
    expect(() => requireUserMutationAck("update", { user }, {
      userId: id, displayName: "Unconfirmed",
    })).toThrow(notConfirmed);
  });
  it("accepts exact user edit ACK", () => {
    expect(() => requireUserMutationAck("update", { user }, {
      userId: id, displayName: user.display_name,
    })).not.toThrow();
  });
  it("requires every submitted editable profile field to match persisted SQL on invite and edit", () => {
    const fields = { username: "test.member", phone: "0123456789", employee_id: "E-001", user_type: "Governance Member" };
    const expected = { displayName: user.display_name, username: fields.username,
      phone: fields.phone, employeeId: fields.employee_id, userType: fields.user_type };
    for (const action of ["invite", "update"] as const) {
      const intent = { ...expected, email: user.email, userId: id };
      expect(() => requireUserMutationAck(action, { user: { ...user, ...fields } }, intent)).not.toThrow();
      for (const key of Object.keys(fields)) {
        for (const value of [undefined, "stale-value"]) {
          expect(() => requireUserMutationAck(action, { user: { ...user, ...fields, [key]: value } }, intent)).toThrow(notConfirmed);
        }
      }
      expect(() => requireUserMutationAck(action, { user: { ...user, ...fields, display_name: "stale-name" } }, intent)).toThrow(notConfirmed);
    }
  });
  it("distinguishes confirmed null optional fields from omitted or stale values", () => {
    const expected = { userId: id, phone: null, employeeId: null };
    expect(() => requireUserMutationAck("update", { user: { ...user, phone: null, employee_id: null } }, expected)).not.toThrow();
    expect(() => requireUserMutationAck("update", { user }, expected)).toThrow(notConfirmed);
    expect(() => requireUserMutationAck("update", { user: { ...user, phone: "old", employee_id: null } }, expected)).toThrow(notConfirmed);
  });
  it("denies false status-change confirmations and accepts exact target", () => {
    expect(() => requireUserMutationAck("set_status", { user }, {
      userId: id, status: "suspended",
    })).toThrow(notConfirmed);
    expect(() => requireUserMutationAck("set_status", {
      user: { ...user, account_status: "suspended" },
    }, { userId: id, status: "suspended" })).not.toThrow();
  });
  it("requires explicit acknowledged password and delete results", () => {
    for (const action of ["set_password", "delete"] as const) {
      expect(() => requireUserMutationAck(action, { ok: true })).not.toThrow();
      expect(() => requireUserMutationAck(action, { ok: false })).toThrow(notConfirmed);
      expect(() => requireUserMutationAck(action, {})).toThrow(notConfirmed);
    }
  });
  it("rejects malformed UUID, missing user, empty result and malformed response", () => {
    expect(() => requireUserMutationAck("update", { user: { ...user, user_id: "bad" } }, {
      userId: id,
    })).toThrow(notConfirmed);
    expect(() => requireUserMutationAck("update", {}, { userId: id })).toThrow(notConfirmed);
    expect(() => requireUserMutationAck("update", null, { userId: id })).toThrow(notConfirmed);
  });
});
