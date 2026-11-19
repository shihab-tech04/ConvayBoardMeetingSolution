import { describe, expect, it } from "vitest";
import { isAgendaOwnedBy, resolveAgendaOwnerUserId } from "../app/pages/register-stock/agendaOwnerIdentity";

const users = [
  { id: "bms-1", name: "Same Name", employee_id: "E-1", email: "one@example.com" },
  { id: "bms-2", name: "Same Name", employee_id: "E-2", email: "two@example.com" },
];

describe("AG-07 stable agenda ownership", () => {
  it("prefers exact BMS id instead of duplicate display names", () => {
    expect(resolveAgendaOwnerUserId(users, { id: "bms-2" })).toBe("bms-2");
  });
  it("uses unique employee reference when session id is external auth id", () => {
    expect(resolveAgendaOwnerUserId(users, { id: "auth-external", employeeId: "E-1" })).toBe("bms-1");
  });
  it("matches email case-insensitively with surrounding whitespace", () => {
    expect(resolveAgendaOwnerUserId(users, { email: " TWO@EXAMPLE.COM " })).toBe("bms-2");
  });
  it("does not grant ownership from display name alone", () => {
    expect(resolveAgendaOwnerUserId(users, {})).toBeNull();
  });
  it("fails closed on contradictory matched identifiers", () => {
    expect(resolveAgendaOwnerUserId(users, { id: "bms-1", employeeId: "E-2" })).toBeNull();
  });
  it("fails closed on duplicated email identities", () => {
    expect(resolveAgendaOwnerUserId([...users, { ...users[1], id: "bms-3" }], { email: "two@example.com" })).toBeNull();
  });
  it("does not mistake another person's record as owned", () => {
    expect(isAgendaOwnedBy("bms-1", "bms-2")).toBe(false);
    expect(isAgendaOwnedBy("bms-1", "bms-1")).toBe(true);
  });
  it("fails closed with missing owner or unresolved identity", () => {
    expect(isAgendaOwnedBy("bms-1", null)).toBe(false);
    expect(isAgendaOwnedBy(undefined, "bms-1")).toBe(false);
    expect(resolveAgendaOwnerUserId([], { id: "bms-1" })).toBeNull();
  });
});
