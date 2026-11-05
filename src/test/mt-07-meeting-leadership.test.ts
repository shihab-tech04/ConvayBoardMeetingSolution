import { describe, expect, it } from "vitest";
import { buildInitialValuesFromRow } from "../app/components/forms/formInitialValues";
import { meetingLeadershipPayload, resolveMeetingLeadership } from "../app/pages/return-register/meetingLeadership";

const users = [
  { id: "user-1", name: "Alex Lee", status: "Active" },
  { id: "user-2", name: "Alex Lee", status: "Active" },
  { id: "user-3", name: "Sam Rahman", status: "Active" },
  { id: "user-4", name: "Inactive Person", status: "Inactive" },
];

describe("MT-07 meeting leadership assignments", () => {
  it("restores canonical user IDs after reload even when names are duplicated", () => {
    const initial = buildInitialValuesFromRow({
      chairperson: "Alex Lee",
      chairperson_user_id: "user-2",
      secretary: "Sam Rahman",
      secretary_user_id: "user-3",
      organizer: "Alex Lee",
      organizer_user_id: "user-1",
    }, [
      { key: "chairperson", initialValueKey: "chairperson_user_id", label: "Chairperson", type: "select", options: users.map(user => ({ value: user.id, label: user.name })) },
      { key: "secretary", initialValueKey: "secretary_user_id", label: "Secretary", type: "select", options: users.map(user => ({ value: user.id, label: user.name })) },
      { key: "organizer", initialValueKey: "organizer_user_id", label: "Organizer", type: "select", options: users.map(user => ({ value: user.id, label: user.name })) },
    ]);

    expect(initial).toEqual({ chairperson: "user-2", secretary: "user-3", organizer: "user-1" });
  });

  it("resolves legacy display names only when exactly one registered user matches", () => {
    const resolved = resolveMeetingLeadership({
      chairperson: "user-2",
      secretary: "Sam Rahman — Director",
      organizer: "Alex Lee",
    }, users);

    expect(resolved.ids).toEqual({ chairperson: "user-2", secretary: "user-3", organizer: "" });
    expect(resolved.names).toEqual({ chairperson: "Alex Lee", secretary: "Sam Rahman", organizer: "" });
    expect(resolved.missing).toEqual(["organizer"]);
    expect(meetingLeadershipPayload(resolved)).toEqual({
      chairperson: "Alex Lee",
      chairperson_user_id: "user-2",
      secretary: "Sam Rahman",
      secretary_user_id: "user-3",
      organizer: "",
      organizer_user_id: "",
    });
  });

  it("rejects inactive or unknown users instead of persisting an unregistered assignment", () => {
    const resolved = resolveMeetingLeadership({
      chairperson: "user-4",
      secretary: "user-3",
      organizer: "missing-user",
    }, users);

    expect(resolved.ids).toEqual({ chairperson: "", secretary: "user-3", organizer: "" });
    expect(resolved.missing).toEqual(["chairperson", "organizer"]);
  });

  it("restores a legacy name only when that name maps to one option", () => {
    const options = users.slice(0, 2).map(user => ({ value: user.id, label: `${user.name} — Board Member` }));
    const initial = buildInitialValuesFromRow({ chairperson: "Alex Lee" }, [
      { key: "chairperson", initialValueKey: "chairperson_user_id", label: "Chairperson", type: "select", options },
    ]);

    expect(initial.chairperson).toBe("");
  });
});
