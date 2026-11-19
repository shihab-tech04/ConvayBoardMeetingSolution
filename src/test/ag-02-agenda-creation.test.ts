import { describe, expect, it } from "vitest";
import { agendaReference, validateCompleteAgenda, type AgendaCreationFields } from "../app/components/agenda/agendaCreationFields";

const valid: AgendaCreationFields = {
  title: "Financial review", reference: "REF-240", committee: "Audit Committee",
  meeting_type: "Regular", agenda_category: "Financial", submitting_division: "Finance",
  submitted_by: "Secretary", presenter_user_id: "user-presenter", owner_user_id: "user-owner",
  purpose: "For Approval", confidentiality: "Internal",
};

describe("AG-02 required creation metadata", () => {
  it("accepts all required fields without changing input", () => {
    expect(validateCompleteAgenda(valid)).toEqual({});
    expect(valid.title).toBe("Financial review");
  });
  it("denies missing governance body and submitter", () => {
    expect(validateCompleteAgenda({ ...valid, committee: " ", submitted_by: "" })).toMatchObject({
      committee: "Governance body is required.", submitted_by: "Authenticated submitter is required.",
    });
  });
  it("denies missing presenter, division and meeting type", () => {
    const errors = validateCompleteAgenda({ ...valid, presenter_user_id: "", submitting_division: " ", meeting_type: "" });
    expect(Object.keys(errors)).toEqual(["meeting_type", "submitting_division", "presenter_user_id"]);
  });
  it("supports explicit references and stable generated-ID fallback", () => {
    expect(agendaReference(" REF-240 ", "AGD-2026-0999")).toBe("REF-240");
    expect(agendaReference("   ", "AGD-2026-0999")).toBe("AGD-2026-0999");
  });
});
